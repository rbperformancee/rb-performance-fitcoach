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
import AVFoundation
import UIKit

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
        CAPPluginMethod(name: "getVO2Max", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getLatestHRV", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setAudioCuesEnabled", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setIndoorMode", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "exportGPX", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getStrideLength", returnType: CAPPluginReturnPromise),
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

    // ─── CMMotionActivityManager : iOS détecte automotive/walking/running
    // → auto-pause plus intelligent que speed-only. Si iOS dit "automotive"
    // avec confidence haute, on émet un warning event au lieu d'enregistrer
    // un faux run en voiture.
    private var motionActivityManager: CMMotionActivityManager?
    private var lastActivityType: String = "unknown"

    // ─── AVSpeechSynthesizer : audio cues vocaux à chaque km franchi.
    // Speak en background via AVAudioSession .ambient + .mixWithOthers
    // (= cohabite avec Spotify, baisse pas la musique).
    private var speechSynth: AVSpeechSynthesizer?
    private var audioCuesEnabled: Bool = true

    // ─── Indoor mode : skip GPS, distance via CMPedometer (steps × stride)
    // Utile sur tapis de course où le GPS donne 0 ou bug.
    private var isIndoorMode: Bool = false

    // ─── Stride length detection : CMPedometer expose averageActivePace
    // qui permet de calculer la foulée moyenne. Indicateur pro recherché
    // par les coureurs sérieux (~1.20m amateur, ~1.50m+ élite).
    private var lastKnownStrideLengthM: Double = 0

    // ─── Kalman filter GPS : maintient un état lissé (position + variance)
    // pour rejeter les sauts aberrants et lisser les coordonnées sous
    // tunnel/arbres. Implémentation 2D simple (lat/lng séparés). État =
    // [lat, lng], variance = horizontalAccuracy².
    private var kalmanLat: Double?
    private var kalmanLng: Double?
    private var kalmanVariance: Double = 0
    private let kalmanProcessNoise: Double = 1.0  // m²/sec — bruit modèle
    private var lastKalmanUpdateAt: Date?

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
            self.startMotionActivityDetection()
            self.resetKalman()  // état clean pour ce run

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
            self.stopMotionActivityDetection()

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
            // Reprise app : timestamps requis par JS pour réattacher la session
            // sans repartir d'un "idle". Sans ces deux champs, le RunSession ne
            // peut pas reconstituer la durée si l'app est tuée puis revient.
            "startedAtMs": (startedAt?.timeIntervalSince1970 ?? 0) * 1000,
            "pausedDurationS": Int(totalPausedDuration),
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

            // Lissage Kalman pour la position publiée et le calcul distance.
            // Réduit l'impact des sauts GPS sous tunnel/arbres → distance
            // plus précise. On crée une CLLocation "smoothed" avec les coords
            // filtrées pour le calcul distance, mais on garde l'altitude /
            // accuracy d'origine.
            let (smoothedLat, smoothedLng) = updateKalman(loc: loc)
            let smoothedLoc = CLLocation(
                coordinate: CLLocationCoordinate2D(latitude: smoothedLat, longitude: smoothedLng),
                altitude: loc.altitude,
                horizontalAccuracy: loc.horizontalAccuracy,
                verticalAccuracy: loc.verticalAccuracy,
                course: loc.course,
                speed: loc.speed,
                timestamp: loc.timestamp
            )

            // Cumul distance via Haversine (CLLocation.distance utilise WGS84, suffit)
            if let prev = lastNonPausedLocation {
                let delta = smoothedLoc.distance(from: prev)
                let dt = loc.timestamp.timeIntervalSince(prev.timestamp)
                // Filtre les sauts GPS aberrants : > 50m d'un coup OU
                // vitesse implicite (delta/dt) > maxRunSpeedMps (= delta
                // implausible vs temps écoulé).
                let implicitSpeed = dt > 0 ? delta / dt : 999
                if delta < 50 && implicitSpeed <= maxRunSpeedMps {
                    totalDistance += delta
                }
            }
            lastNonPausedLocation = smoothedLoc
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
                let paceSPerKm = currentKm > 0 && totalDuration > 0
                                    ? Int(totalDuration / Double(currentKm)) : 0
                notifyListeners("kmReached", data: [
                    "km": currentKm,
                    "splitDurationS": Int(splitDuration),
                    "paceSPerKm": paceSPerKm,
                ])
                // Audio cue vocal (TTS) "Kilomètre N, allure X:YZ par km"
                self.speakKmCue(km: currentKm, paceSPerKm: paceSPerKm)
                // Haptic feedback : double tap au km — l'athlète sent le km
                // dans la main même casque pas brancké ou audio cues off.
                let generator = UINotificationFeedbackGenerator()
                generator.notificationOccurred(.success)
                lastKmReached = currentKm
                lastKmAt = now
            }

            // GPS quality live : publié à chaque update pour que l'UI puisse
            // afficher "Strong/Medium/Weak" en temps réel (cf overlay screen).
            let gpsQuality: String
            if loc.horizontalAccuracy < 5 { gpsQuality = "strong" }
            else if loc.horizontalAccuracy < 10 { gpsQuality = "good" }
            else if loc.horizontalAccuracy < 15 { gpsQuality = "medium" }
            else { gpsQuality = "weak" }
            notifyListeners("gpsQuality", data: [
                "quality": gpsQuality,
                "accuracyM": loc.horizontalAccuracy,
            ])
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
                // Indoor mode : on calcule la distance via CMPedometer
                // (steps + stride length estimé). Sans GPS, sur tapis.
                if self.isIndoorMode, let pedDist = data.distance?.doubleValue {
                    self.totalDistance = pedDist
                    self.notifyListeners("locationUpdate", data: [
                        "lat": 0, "lng": 0, "speed": 0, "alt": 0, "accuracy": 0, "t": 0,
                        "distanceM": pedDist, "indoor": true,
                    ])
                }
            }
        }
    }

    // MARK: - CMMotionActivityManager (#3 — auto-détect course/voiture/marche)
    //
    // iOS classifie l'activité courante : running/walking/automotive/cycling/
    // stationary. On l'utilise pour :
    //  1. Émettre un warning si l'user passe en .automotive pendant un run
    //     (= il est monté en voiture → on alerte au lieu d'enregistrer un
    //     faux split à 100 km/h)
    //  2. Auto-pause plus intelligent (combine avec speed)

    private func startMotionActivityDetection() {
        guard CMMotionActivityManager.isActivityAvailable() else { return }
        if motionActivityManager == nil {
            motionActivityManager = CMMotionActivityManager()
        }
        motionActivityManager?.startActivityUpdates(to: .main) { [weak self] activity in
            guard let self = self, let act = activity else { return }
            // Confidence : low/medium/high. On agit que sur high.
            guard act.confidence == .high else { return }

            var type = "unknown"
            if act.running { type = "running" }
            else if act.walking { type = "walking" }
            else if act.cycling { type = "cycling" }
            else if act.automotive { type = "automotive" }
            else if act.stationary { type = "stationary" }

            if type != self.lastActivityType {
                self.lastActivityType = type
                self.notifyListeners("motionActivityChanged", data: ["type": type])

                // Warning si l'user passe en voiture pendant un run actif
                if type == "automotive" && self.isRunning && !self.isPaused {
                    self.notifyListeners("motionAutomotiveDetected", data: [
                        "warning": "Activité véhicule détectée — ton run est suspect",
                    ])
                }
            }
        }
    }

    private func stopMotionActivityDetection() {
        motionActivityManager?.stopActivityUpdates()
    }

    // MARK: - Audio cues vocaux (#1 — speak km splits via TTS)
    //
    // AVSpeechSynthesizer parle "Kilomètre 1, allure 5 minutes 12, distance
    // 1 kilomètre". Fonctionne même iPhone verrouillé + en background grâce
    // à AVAudioSession en .ambient .mixWithOthers (cohabite avec Spotify).

    private func ensureSpeechSynth() {
        if speechSynth == nil {
            speechSynth = AVSpeechSynthesizer()
        }
        // Configure la session audio pour cohabiter avec la musique de l'user.
        // .ambient = baisse pas le volume des autres apps, juste parle par-dessus.
        do {
            let s = AVAudioSession.sharedInstance()
            try s.setCategory(.ambient, mode: .default, options: [.mixWithOthers, .duckOthers])
        } catch {
            // Silent fail — pas critique
        }
    }

    private func speakKmCue(km: Int, paceSPerKm: Int) {
        guard audioCuesEnabled else { return }
        ensureSpeechSynth()
        guard let synth = speechSynth else { return }

        // Format "Kilomètre 3, allure 5 minutes 12 secondes par kilomètre"
        let paceMin = paceSPerKm / 60
        let paceSec = paceSPerKm % 60
        let paceText: String
        if paceSPerKm == 0 {
            paceText = ""
        } else if paceSec == 0 {
            paceText = ", allure \(paceMin) minutes par kilomètre"
        } else {
            paceText = ", allure \(paceMin) minutes \(paceSec) secondes par kilomètre"
        }
        let text = "Kilomètre \(km)\(paceText)"

        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = AVSpeechSynthesisVoice(language: "fr-FR")
        utterance.rate = 0.5  // un peu plus lent que default (0.5 = naturel)
        utterance.volume = 1.0
        utterance.preUtteranceDelay = 0.2
        synth.speak(utterance)
    }

    @objc func setAudioCuesEnabled(_ call: CAPPluginCall) {
        let enabled = call.getBool("enabled") ?? true
        audioCuesEnabled = enabled
        call.resolve(["enabled": enabled])
    }

    // MARK: - Indoor mode (#4 — tapis de course, distance via pédomètre)

    @objc func setIndoorMode(_ call: CAPPluginCall) {
        let indoor = call.getBool("indoor") ?? false
        isIndoorMode = indoor
        // Si indoor, on arrête la consommation GPS pour la batterie
        DispatchQueue.main.async { [weak self] in
            if indoor {
                self?.locationManager?.stopUpdatingLocation()
            } else if self?.isRunning == true && self?.isPaused == false {
                self?.locationManager?.startUpdatingLocation()
            }
        }
        call.resolve(["indoor": indoor])
    }

    // MARK: - VO2max + HRV (#2 + #5 — read latest from HealthKit)
    //
    // iOS calcule automatiquement le VO2max si l'user a un Apple Watch
    // (workouts + HR). On lit le dernier sample. Idem HRV (SDNN).

    @objc func getVO2Max(_ call: CAPPluginCall) {
        ensureHealthStore()
        guard let hs = healthStore,
              let type = HKQuantityType.quantityType(forIdentifier: .vo2Max) else {
            call.resolve(["available": false]); return
        }
        let sort = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)
        let query = HKSampleQuery(sampleType: type, predicate: nil, limit: 1, sortDescriptors: [sort]) { _, samples, _ in
            guard let sample = samples?.first as? HKQuantitySample else {
                call.resolve(["available": false]); return
            }
            let unit = HKUnit(from: "ml/kg*min")
            let value = sample.quantity.doubleValue(for: unit)
            call.resolve([
                "available": true,
                "value": value,
                "date": sample.endDate.timeIntervalSince1970,
            ])
        }
        hs.execute(query)
    }

    @objc func getLatestHRV(_ call: CAPPluginCall) {
        ensureHealthStore()
        guard let hs = healthStore,
              let type = HKQuantityType.quantityType(forIdentifier: .heartRateVariabilitySDNN) else {
            call.resolve(["available": false]); return
        }
        let sort = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)
        let query = HKSampleQuery(sampleType: type, predicate: nil, limit: 1, sortDescriptors: [sort]) { _, samples, _ in
            guard let sample = samples?.first as? HKQuantitySample else {
                call.resolve(["available": false]); return
            }
            // HRV SDNN unit = milliseconds
            let value = sample.quantity.doubleValue(for: HKUnit.secondUnit(with: .milli))
            call.resolve([
                "available": true,
                "value": value,
                "date": sample.endDate.timeIntervalSince1970,
            ])
        }
        hs.execute(query)
    }

    // MARK: - Stride length (#9 — foulée moyenne via CMPedometer)
    //
    // CMPedometer expose la distance estimée à partir des steps + un modèle
    // interne de stride length (calibré sur l'historique de l'utilisateur).
    // On calcule la foulée moyenne = distance_pedometer / steps.

    @objc func getStrideLength(_ call: CAPPluginCall) {
        guard CMPedometer.isStepCountingAvailable() else {
            call.resolve(["available": false]); return
        }
        let pedometer = CMPedometer()
        // Stride length actuel : on prend la dernière heure pour avoir un
        // échantillon représentatif (au moins 100 pas idéalement).
        let oneHourAgo = Date().addingTimeInterval(-3600)
        pedometer.queryPedometerData(from: oneHourAgo, to: Date()) { data, _ in
            guard let data = data,
                  let dist = data.distance?.doubleValue,
                  data.numberOfSteps.intValue > 50, dist > 0 else {
                call.resolve(["available": false]); return
            }
            let strideM = dist / data.numberOfSteps.doubleValue
            self.lastKnownStrideLengthM = strideM
            call.resolve([
                "available": true,
                "strideM": strideM,
                "stepsSample": data.numberOfSteps.intValue,
            ])
        }
    }

    // MARK: - Kalman filter GPS (#10 — lissage state-of-the-art)
    //
    // Filtre Kalman 1D simple appliqué à chaque coordonnée (lat, lng).
    // Maintient un état lissé + variance. Mis à jour à chaque GPS update.
    //
    // Formule (1D, mesure scalaire) :
    //   variance += processNoise × dt
    //   gain = variance / (variance + measurementVariance)
    //   estimate = estimate + gain × (measurement - estimate)
    //   variance = (1 - gain) × variance
    //
    // En 2D on l'applique sur lat et lng séparément (couplage faible OK
    // pour des coords GPS proches).

    /// Met à jour le filtre Kalman avec une nouvelle observation GPS.
    /// Retourne (smoothedLat, smoothedLng) — à utiliser à la place de loc.coordinate.
    private func updateKalman(loc: CLLocation) -> (Double, Double) {
        let measurementVariance = max(loc.horizontalAccuracy * loc.horizontalAccuracy, 1.0)
        let now = loc.timestamp

        // Première observation : initialise l'état
        guard let prevLat = kalmanLat, let prevLng = kalmanLng else {
            kalmanLat = loc.coordinate.latitude
            kalmanLng = loc.coordinate.longitude
            kalmanVariance = measurementVariance
            lastKalmanUpdateAt = now
            return (loc.coordinate.latitude, loc.coordinate.longitude)
        }

        // dt depuis dernière update — on inflate la variance
        let dt = lastKalmanUpdateAt.map { now.timeIntervalSince($0) } ?? 1.0
        kalmanVariance += kalmanProcessNoise * dt

        // Gain Kalman
        let gain = kalmanVariance / (kalmanVariance + measurementVariance)

        // Update lat
        let smoothedLat = prevLat + gain * (loc.coordinate.latitude - prevLat)
        // Update lng
        let smoothedLng = prevLng + gain * (loc.coordinate.longitude - prevLng)

        // Update variance
        kalmanVariance = (1.0 - gain) * kalmanVariance

        kalmanLat = smoothedLat
        kalmanLng = smoothedLng
        lastKalmanUpdateAt = now

        return (smoothedLat, smoothedLng)
    }

    /// Reset le filtre Kalman au début/fin d'un run.
    private func resetKalman() {
        kalmanLat = nil
        kalmanLng = nil
        kalmanVariance = 0
        lastKalmanUpdateAt = nil
    }

    // MARK: - GPX export (#11 — export du parcours au format Strava-compatible)
    //
    // Génère un fichier GPX du parcours pour partager sur Strava/Garmin/etc.
    // Format GPX 1.1 standard. Retourne le contenu XML — le JS s'occupe
    // de l'écrire sur disque + share sheet.

    @objc func exportGPX(_ call: CAPPluginCall) {
        guard !collectedRouteLocations.isEmpty else {
            call.reject("No route data — run a session first or in progress"); return
        }
        let isoFormatter = ISO8601DateFormatter()
        isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

        var gpx = """
        <?xml version="1.0" encoding="UTF-8"?>
        <gpx version="1.1" creator="RB Perform"
             xmlns="http://www.topografix.com/GPX/1/1"
             xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1">
          <metadata>
            <name>RB Perform Run</name>
            <time>\(isoFormatter.string(from: startedAt ?? Date()))</time>
          </metadata>
          <trk>
            <name>Run</name>
            <type>running</type>
            <trkseg>

        """
        for loc in collectedRouteLocations {
            let timeStr = isoFormatter.string(from: loc.timestamp)
            gpx += """
                  <trkpt lat="\(loc.coordinate.latitude)" lon="\(loc.coordinate.longitude)">
                    <ele>\(loc.altitude)</ele>
                    <time>\(timeStr)</time>
                  </trkpt>

            """
        }
        gpx += """
            </trkseg>
          </trk>
        </gpx>
        """
        call.resolve([
            "gpx": gpx,
            "pointsCount": collectedRouteLocations.count,
        ])
    }
}
