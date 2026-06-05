// RunTrackerPlugin.swift
// RB Perform — Tracker de course GPS natif (Phase 1)
//
// Pipeline natif :
//   CLLocationManager (GPS haute précision, activityType=.fitness,
//     allowsBackgroundLocationUpdates=true) → publie chaque coord
//     à JS via Capacitor event "locationUpdate".
//   CMPedometer (Core Motion) → cadence (pas/min) via "cadenceUpdate".
//   Calcul interne distance Haversine cumulée pour fiabilité.
//   Auto-pause détecté : vitesse < 0.5 m/s pendant 8s → "autoPaused".
//
// API JS exposée :
//   await RunTracker.requestPermission()  → { granted: bool, level: 'always'|'when_in_use'|'denied' }
//   await RunTracker.start({ targetDistance?, targetPace? })
//   await RunTracker.pause() / resume() / stop()
//   await RunTracker.getStats()  → { distance, durationS, paceSPerKm, lastLocation }
//
// Events JS (RunTracker.addListener('xxx', cb)):
//   - locationUpdate : { lat, lng, speed, alt, accuracy, t }
//   - kmReached      : { km, splitDurationS, paceSPerKm }
//   - autoPaused / autoResumed
//   - cadenceUpdate  : { stepsPerMinute }
//   - permissionChanged: { level }
//
// Enregistré dans MyBridgeViewController.capacitorDidLoad().

import Foundation
import Capacitor
import CoreLocation
import CoreMotion

@objc(RunTrackerPlugin)
public class RunTrackerPlugin: CAPPlugin, CAPBridgedPlugin, CLLocationManagerDelegate {
    public let identifier = "RunTrackerPlugin"
    public let jsName = "RunTracker"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "requestPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pause", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "resume", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getStats", returnType: CAPPluginReturnPromise),
    ]

    // MARK: - Stored state
    private var locationManager: CLLocationManager?
    private var pedometer: CMPedometer?
    private var isRunning: Bool = false
    private var isPaused: Bool = false
    private var startedAt: Date?
    private var pausedAt: Date?
    private var totalPausedDuration: TimeInterval = 0
    private var lastLocation: CLLocation?
    private var lastNonPausedLocation: CLLocation?
    private var totalDistance: CLLocationDistance = 0  // meters
    private var lastKmReached: Int = 0
    private var lastKmAt: Date?  // pour calcul split
    private var slowSpeedSince: Date?  // auto-pause détection
    private var permissionCallId: String?

    // MARK: - Permission

    @objc func requestPermission(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.ensureManager()
            let status = self.locationManager?.authorizationStatus ?? .notDetermined

            switch status {
            case .authorizedAlways:
                call.resolve(["granted": true, "level": "always"])
            case .authorizedWhenInUse:
                // On a déjà whenInUse — on essaie de bump à .always pour le background
                self.permissionCallId = call.callbackId
                self.bridge?.saveCall(call)
                self.locationManager?.requestAlwaysAuthorization()
                // didChangeAuthorization callback va resolve
            case .notDetermined:
                self.permissionCallId = call.callbackId
                self.bridge?.saveCall(call)
                self.locationManager?.requestWhenInUseAuthorization()
            case .denied, .restricted:
                call.resolve(["granted": false, "level": "denied"])
            @unknown default:
                call.resolve(["granted": false, "level": "denied"])
            }
        }
    }

    public func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        let status = manager.authorizationStatus
        let level: String
        let granted: Bool
        switch status {
        case .authorizedAlways: level = "always"; granted = true
        case .authorizedWhenInUse: level = "when_in_use"; granted = true
        case .denied: level = "denied"; granted = false
        case .restricted: level = "denied"; granted = false
        case .notDetermined: return // pas encore décidé, on attend
        @unknown default: level = "denied"; granted = false
        }

        // Resolve la promesse en attente si présente
        if let callId = permissionCallId, let call = bridge?.savedCall(withID: callId) {
            call.resolve(["granted": granted, "level": level])
            bridge?.releaseCall(call)
            permissionCallId = nil
        }
        notifyListeners("permissionChanged", data: ["level": level])
    }

    // MARK: - Lifecycle

    private func ensureManager() {
        if locationManager == nil {
            let mgr = CLLocationManager()
            mgr.delegate = self
            mgr.desiredAccuracy = kCLLocationAccuracyBest
            mgr.distanceFilter = 5  // meters — équilibre précision/batterie
            mgr.activityType = .fitness
            mgr.pausesLocationUpdatesAutomatically = false
            mgr.showsBackgroundLocationIndicator = true
            // allowsBackgroundLocationUpdates ne peut être set qu'à true
            // si l'app a la 'location' background mode dans Info.plist.
            mgr.allowsBackgroundLocationUpdates = true
            locationManager = mgr
        }
    }

    // MARK: - Start / Pause / Resume / Stop

    @objc func start(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.ensureManager()

            let status = self.locationManager?.authorizationStatus ?? .notDetermined
            guard status == .authorizedAlways || status == .authorizedWhenInUse else {
                call.reject("Location permission not granted")
                return
            }

            // Reset state
            self.isRunning = true
            self.isPaused = false
            self.startedAt = Date()
            self.pausedAt = nil
            self.totalPausedDuration = 0
            self.lastLocation = nil
            self.lastNonPausedLocation = nil
            self.totalDistance = 0
            self.lastKmReached = 0
            self.lastKmAt = self.startedAt
            self.slowSpeedSince = nil

            self.locationManager?.startUpdatingLocation()
            self.startPedometer()
            call.resolve(["startedAt": self.startedAt?.timeIntervalSince1970 ?? 0])
        }
    }

    @objc func pause(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self, self.isRunning, !self.isPaused else {
                call.resolve()
                return
            }
            self.isPaused = true
            self.pausedAt = Date()
            self.locationManager?.stopUpdatingLocation()
            call.resolve()
        }
    }

    @objc func resume(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self, self.isRunning, self.isPaused else {
                call.resolve()
                return
            }
            if let pAt = self.pausedAt {
                self.totalPausedDuration += Date().timeIntervalSince(pAt)
            }
            self.isPaused = false
            self.pausedAt = nil
            self.slowSpeedSince = nil
            self.lastNonPausedLocation = nil  // évite distance fantôme au resume
            self.locationManager?.startUpdatingLocation()
            call.resolve()
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.locationManager?.stopUpdatingLocation()
            self.pedometer?.stopUpdates()

            let endedAt = Date()
            let totalDuration = (self.startedAt.map { endedAt.timeIntervalSince($0) } ?? 0)
                                 - self.totalPausedDuration

            var summary: [String: Any] = [
                "distanceM": self.totalDistance,
                "durationS": Int(totalDuration),
                "pausedDurationS": Int(self.totalPausedDuration),
                "startedAt": self.startedAt?.timeIntervalSince1970 ?? 0,
                "endedAt": endedAt.timeIntervalSince1970,
            ]
            if self.totalDistance > 0 && totalDuration > 0 {
                summary["paceSPerKm"] = Int((totalDuration / (self.totalDistance / 1000.0)))
            }

            self.isRunning = false
            self.isPaused = false
            self.startedAt = nil
            self.totalDistance = 0
            self.lastKmReached = 0

            call.resolve(summary)
        }
    }

    @objc func getStats(_ call: CAPPluginCall) {
        let now = Date()
        let totalDuration = (startedAt.map { now.timeIntervalSince($0) } ?? 0) - totalPausedDuration
        var data: [String: Any] = [
            "distanceM": totalDistance,
            "durationS": Int(totalDuration),
            "isRunning": isRunning,
            "isPaused": isPaused,
        ]
        if totalDistance > 0 && totalDuration > 0 {
            data["paceSPerKm"] = Int((totalDuration / (totalDistance / 1000.0)))
        }
        if let last = lastLocation {
            data["lastLocation"] = [
                "lat": last.coordinate.latitude,
                "lng": last.coordinate.longitude,
                "speed": max(0, last.speed),
                "alt": last.altitude,
                "accuracy": last.horizontalAccuracy,
            ]
        }
        call.resolve(data)
    }

    // MARK: - CLLocationManagerDelegate

    public func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard isRunning, !isPaused else { return }
        guard let startedAt = startedAt else { return }

        for loc in locations {
            // Filtre les positions trop imprécises (>30m) ou trop anciennes (>5s)
            if loc.horizontalAccuracy < 0 || loc.horizontalAccuracy > 30 { continue }
            if Date().timeIntervalSince(loc.timestamp) > 5 { continue }

            // Cumul distance via Haversine (CLLocation.distance utilise WGS84, suffit)
            if let prev = lastNonPausedLocation {
                let delta = loc.distance(from: prev)
                // Filtre les sauts GPS aberrants (>50m d'un coup = bug)
                if delta < 50 {
                    totalDistance += delta
                }
            }
            lastNonPausedLocation = loc
            lastLocation = loc

            // Auto-pause : si vitesse < 0.5 m/s pendant 8s consécutives
            if loc.speed >= 0 && loc.speed < 0.5 {
                if slowSpeedSince == nil { slowSpeedSince = Date() }
                else if let s = slowSpeedSince, Date().timeIntervalSince(s) > 8 {
                    isPaused = true
                    pausedAt = Date()
                    notifyListeners("autoPaused", data: [:])
                    slowSpeedSince = nil
                }
            } else {
                slowSpeedSince = nil
            }

            // Publish location
            let t = Int(loc.timestamp.timeIntervalSince(startedAt) * 1000)
            notifyListeners("locationUpdate", data: [
                "lat": loc.coordinate.latitude,
                "lng": loc.coordinate.longitude,
                "speed": max(0, loc.speed),
                "alt": loc.altitude,
                "accuracy": loc.horizontalAccuracy,
                "t": t,
                "distanceM": totalDistance,
            ])

            // Détection km franchis
            let currentKm = Int(totalDistance / 1000.0)
            if currentKm > lastKmReached {
                let now = Date()
                let splitDuration = lastKmAt.map { now.timeIntervalSince($0) } ?? 0
                let totalDuration = now.timeIntervalSince(startedAt) - totalPausedDuration
                notifyListeners("kmReached", data: [
                    "km": currentKm,
                    "splitDurationS": Int(splitDuration),
                    "paceSPerKm": currentKm > 0 && totalDuration > 0
                                    ? Int(totalDuration / Double(currentKm)) : 0,
                ])
                lastKmReached = currentKm
                lastKmAt = now
            }
        }
    }

    public func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        notifyListeners("locationError", data: ["error": error.localizedDescription])
    }

    // MARK: - Pedometer

    private func startPedometer() {
        guard CMPedometer.isCadenceAvailable() else { return }
        pedometer = CMPedometer()
        pedometer?.startUpdates(from: Date()) { [weak self] data, error in
            guard let self = self, let data = data, error == nil else { return }
            DispatchQueue.main.async {
                if let cadence = data.currentCadence?.doubleValue {
                    // currentCadence est en steps/s → on multiplie ×60 pour spm
                    let spm = Int(cadence * 60)
                    self.notifyListeners("cadenceUpdate", data: ["stepsPerMinute": spm])
                }
            }
        }
    }
}
