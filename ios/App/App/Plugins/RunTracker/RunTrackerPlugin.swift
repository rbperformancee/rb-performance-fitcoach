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
import HealthKit

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

    // ─── CMAltimeter : dénivelé précis via baromètre iPhone ──────────────
    // GPS altitude = ±10-15m de précision (inutilisable pour D+/D-).
    // Baromètre = ±0.5m (Strava/Runna l'utilisent). iPhone 6+/SE+ ont
    // le capteur. Gain d'altitude cumulé = somme des deltas positifs >
    // seuil de bruit (0.3m).
    private var altimeter: CMAltimeter?
    private var elevationGainM: Double = 0  // D+ cumulé
    private var elevationLossM: Double = 0  // D- cumulé
    private var lastBaroAltitude: Double?  // altitude relative dernière mesure

    // ─── HealthKit workout : intégration officielle Apple Health ─────────
    // HKWorkoutBuilder écrit le run dans Health.app à la fin, remplit les
    // Activity Rings de l'utilisateur, sync l'Apple Watch. Sans ça, le run
    // reste cantonné à RB Perform — pas visible dans Health/Fitness/Watch.
    private var healthStore: HKHealthStore?
    private var workoutBuilder: HKWorkoutBuilder?
    private var workoutRouteBuilder: HKWorkoutRouteBuilder?
    private var workoutStartDate: Date?
    private var workoutAccumulatedDistance: HKQuantity = HKQuantity(unit: .meter(), doubleValue: 0)
    private var collectedRouteLocations: [CLLocation] = []

    // ─── GPS smoothing : drop sauts aberrants + filtre vitesse ──────────
    // Avant on droppait juste sauts > 50m. Maintenant on drop aussi les
    // vitesses absurdes (> 8 m/s = 28 km/h, > sprint sérieux), et on a
    // un filtre accuracy plus strict pour le RUN (vs 30m précédent).
    private let maxRunSpeedMps: Double = 8.0
    private let runAccuracyThresholdM: Double = 20.0  // Strava-tier filter

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
            // kCLLocationAccuracyBestForNavigation = précision MAX iOS, idem
            // que ce que Maps utilise en navigation routière. Active le
            // chipset GPS+GLONASS+Galileo+BeiDou en pleine puissance.
            // Plus précis que kCLLocationAccuracyBest pour le run.
            mgr.desiredAccuracy = kCLLocationAccuracyBestForNavigation
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

    private func ensureHealthStore() {
        if healthStore == nil && HKHealthStore.isHealthDataAvailable() {
            healthStore = HKHealthStore()
        }
    }

    /// Demande les permissions HealthKit pour write workouts + distance +
    /// energy + heart rate. Best-effort : si refusé, le tracking continue
    /// sans écriture dans Health.app.
    private func requestHealthKitAuthorization(_ completion: @escaping (Bool) -> Void) {
        ensureHealthStore()
        guard let hs = healthStore else { completion(false); return }
        let typesToShare: Set<HKSampleType> = [
            HKObjectType.workoutType(),
            HKSeriesType.workoutRoute(),
            HKQuantityType.quantityType(forIdentifier: .distanceWalkingRunning)!,
            HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned)!,
        ]
        let typesToRead: Set<HKObjectType> = [
            HKObjectType.workoutType(),
            HKQuantityType.quantityType(forIdentifier: .heartRate)!,
        ]
        hs.requestAuthorization(toShare: typesToShare, read: typesToRead) { success, _ in
            DispatchQueue.main.async { completion(success) }
        }
    }

    /// Démarre la session HealthKit + altimeter au début du run.
    private func startHealthAndAltimeter() {
        // ── Altimeter (baromètre) ───────────────────────────────────
        elevationGainM = 0
        elevationLossM = 0
        lastBaroAltitude = nil
        if CMAltimeter.isRelativeAltitudeAvailable() {
            let alt = CMAltimeter()
            alt.startRelativeAltitudeUpdates(to: .main) { [weak self] data, _ in
                guard let self = self, let d = data, !self.isPaused else { return }
                let altitudeM = d.relativeAltitude.doubleValue
                if let last = self.lastBaroAltitude {
                    let delta = altitudeM - last
                    // Filtre bruit : seuls les deltas > 0.3m comptent. Sinon
                    // tu accumules le bruit du capteur sur 1h = 100m de D+
                    // fantôme.
                    if abs(delta) >= 0.3 {
                        if delta > 0 { self.elevationGainM += delta }
                        else { self.elevationLossM += abs(delta) }
                        self.lastBaroAltitude = altitudeM
                    }
                } else {
                    self.lastBaroAltitude = altitudeM
                }
            }
            self.altimeter = alt
        }

        // ── HealthKit workout ────────────────────────────────────────
        collectedRouteLocations = []
        workoutAccumulatedDistance = HKQuantity(unit: .meter(), doubleValue: 0)
        requestHealthKitAuthorization { [weak self] granted in
            guard let self = self, granted, let hs = self.healthStore else { return }
            let config = HKWorkoutConfiguration()
            config.activityType = .running
            config.locationType = .outdoor

            do {
                let builder = HKWorkoutBuilder(healthStore: hs, configuration: config, device: .local())
                self.workoutBuilder = builder
                self.workoutRouteBuilder = HKWorkoutRouteBuilder(healthStore: hs, device: .local())
                let startDate = Date()
                self.workoutStartDate = startDate
                builder.beginCollection(withStart: startDate) { _, _ in }
            }
        }
    }

    /// Stoppe altimeter + HealthKit workout proprement.
    private func stopHealthAndAltimeter(endedAt: Date, completion: @escaping () -> Void) {
        // Altimeter
        altimeter?.stopRelativeAltitudeUpdates()
        altimeter = nil

        // HealthKit workout : finalise + sauve dans Health.app
        guard let builder = workoutBuilder else {
            collectedRouteLocations.removeAll()
            workoutRouteBuilder = nil
            workoutStartDate = nil
            completion()
            return
        }

        // Ajoute la distance cumulée comme sample
        if totalDistance > 0, let start = workoutStartDate {
            let distanceType = HKQuantityType.quantityType(forIdentifier: .distanceWalkingRunning)!
            let quantity = HKQuantity(unit: .meter(), doubleValue: totalDistance)
            let sample = HKQuantitySample(type: distanceType, quantity: quantity, start: start, end: endedAt)
            builder.add([sample]) { _, _ in }
        }

        builder.endCollection(withEnd: endedAt) { [weak self] _, _ in
            builder.finishWorkout { [weak self] workout, _ in
                guard let self = self, let workout = workout else {
                    self?.workoutBuilder = nil
                    self?.workoutRouteBuilder = nil
                    self?.collectedRouteLocations.removeAll()
                    DispatchQueue.main.async { completion() }
                    return
                }
                // Associe la route GPS au workout (pour le replay carte dans
                // Health.app + Watch).
                if let routeBuilder = self.workoutRouteBuilder, !self.collectedRouteLocations.isEmpty {
                    routeBuilder.insertRouteData(self.collectedRouteLocations) { _, _ in
                        routeBuilder.finishRoute(with: workout, metadata: nil) { _, _ in
                            self.workoutBuilder = nil
                            self.workoutRouteBuilder = nil
                            self.collectedRouteLocations.removeAll()
                            DispatchQueue.main.async { completion() }
                        }
                    }
                } else {
                    self.workoutBuilder = nil
                    self.workoutRouteBuilder = nil
                    self.collectedRouteLocations.removeAll()
                    DispatchQueue.main.async { completion() }
                }
            }
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

            // CMAltimeter (baromètre) + HKWorkoutBuilder (Apple Health).
            // Fire-and-forget : si user refuse permissions HealthKit, le run
            // continue normalement sans écriture dans Health.app.
            self.startHealthAndAltimeter()

            // Empêche l'auto-lock pendant le run : l'écran reste allumé tant
            // que l'utilisateur court (chronos, allure, distance visibles en
            // continu). Reset à false dans stop() — sans ça, l'écran resterait
            // ON indéfiniment et drain la batterie même hors run.
            UIApplication.shared.isIdleTimerDisabled = true

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

            // Réactive l'auto-lock — fin du run, l'écran peut se verrouiller.
            UIApplication.shared.isIdleTimerDisabled = false

            let endedAt = Date()
            let totalDuration = (self.startedAt.map { endedAt.timeIntervalSince($0) } ?? 0)
                                 - self.totalPausedDuration

            var summary: [String: Any] = [
                "distanceM": self.totalDistance,
                "durationS": Int(totalDuration),
                "pausedDurationS": Int(self.totalPausedDuration),
                "startedAt": self.startedAt?.timeIntervalSince1970 ?? 0,
                "endedAt": endedAt.timeIntervalSince1970,
                // Baromètre : D+ / D- précis (vs GPS imprécis ±10m)
                "elevationGainM": Int(self.elevationGainM),
                "elevationLossM": Int(self.elevationLossM),
            ]
            if self.totalDistance > 0 && totalDuration > 0 {
                summary["paceSPerKm"] = Int((totalDuration / (self.totalDistance / 1000.0)))
            }

            // Finalise HKWorkout dans Health.app (asynchrone, best-effort).
            self.stopHealthAndAltimeter(endedAt: endedAt) {}

            self.isRunning = false
            self.isPaused = false
            self.startedAt = nil
            self.totalDistance = 0
            self.lastKmReached = 0
            self.elevationGainM = 0
            self.elevationLossM = 0

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
            // Baromètre — dénivelé live (D+ / D- en mètres)
            "elevationGainM": Int(elevationGainM),
            "elevationLossM": Int(elevationLossM),
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
            // ── Filtres qualité (Strava-tier) ──────────────────────────
            // Accuracy strict : 20m (avant 30m). Au-dessus → drop.
            if loc.horizontalAccuracy < 0 || loc.horizontalAccuracy > runAccuracyThresholdM { continue }
            // Position trop ancienne (replay buffer GPS) → drop
            if Date().timeIntervalSince(loc.timestamp) > 5 { continue }
            // Vitesse aberrante (saut GPS sous tunnel/arbres). Cap 8 m/s
            // (28 km/h). Au-dessus = bug, on drop.
            if loc.speed > maxRunSpeedMps { continue }

            // Cumul distance via Haversine (CLLocation.distance utilise WGS84, suffit)
            if let prev = lastNonPausedLocation {
                let delta = loc.distance(from: prev)
                let dt = loc.timestamp.timeIntervalSince(prev.timestamp)
                // Filtre les sauts GPS aberrants : > 50m d'un coup OU
                // vitesse implicite (delta/dt) > maxRunSpeedMps (= delta
                // implausible vs temps écoulé).
                let implicitSpeed = dt > 0 ? delta / dt : 999
                if delta < 50 && implicitSpeed <= maxRunSpeedMps {
                    totalDistance += delta
                }
            }
            lastNonPausedLocation = loc
            lastLocation = loc

            // ── Route HealthKit : on collecte les points GPS pour le replay
            // carte dans Health.app (à la fin du run, on push tout en batch).
            collectedRouteLocations.append(loc)

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
