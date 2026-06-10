// MyBridgeViewController.swift
// RB Perform — Subclasse de CAPBridgeViewController pour enregistrer les
// plugins Capacitor custom qui ne sont pas dans un Swift Package séparé.
//
// En Capacitor 8 + SPM, les plugins externes sont auto-discovered via
// Package.swift. Les plugins custom dans le target App doivent être
// enregistrés manuellement ici via `bridge?.registerPluginInstance(...)`.

import UIKit
import Capacitor
import AVFoundation
import ActivityKit

class MyBridgeViewController: CAPBridgeViewController {

    override func capacitorDidLoad() {
        // Enregistre le plugin RestTimerActivity pour le Live Activity du
        // timer de repos (Dynamic Island + Lock Screen).
        if #available(iOS 16.1, *) {
            bridge?.registerPluginInstance(RestTimerActivityPlugin())
        }
        // Enregistre le plugin BarcodeScanner natif (iOS Vision framework).
        // Aucune dépendance externe — Vision est built-in depuis iOS 11.
        // Note : renommé BarcodeScannerLivePlugin (jsName "BarcodeScannerLive")
        // pour éviter collision avec @capacitor-mlkit/barcode-scanning qui
        // s'enregistre aussi en "BarcodeScanner".
        bridge?.registerPluginInstance(BarcodeScannerLivePlugin())
        // Plugin RunActivity : Live Activity Dynamic Island pour le run GPS.
        // Inlined plus bas pour bypass l'ajout au target (cf AlarmSoundPlugin).
        if #available(iOS 16.1, *) {
            bridge?.registerPluginInstance(RunActivityPlugin())
        }
        // Plugin HealthSteps custom (HKHealthStore direct, plus fiable que
        // capacitor-health 8.1.2).
        bridge?.registerPluginInstance(HealthStepsPlugin())
        // Plugin RunTracker (Core Location + CMPedometer) pour le tracker
        // de course GPS natif avec background mode.
        bridge?.registerPluginInstance(RunTrackerPlugin())
        // Plugin AlarmSound : joue rb_alarm.caf via AVAudioPlayer en session
        // .playback → BYPASS du silent switch physique de l'iPhone (impossible
        // depuis Web Audio sous .playAndRecord). Utilisé par RestTimer fin de
        // repos pour garantir le son même si user mode silencieux.
        bridge?.registerPluginInstance(AlarmSoundPlugin())
    }
}

// MARK: - AlarmSoundPlugin
//
// Plugin minimal placé ici (et non dans Plugins/AlarmSound/) parce que le
// target App n'utilise pas de PBXFileSystemSynchronizedRootGroup → ajouter
// un nouveau fichier swift demanderait une édition manuelle de pbxproj.
// MyBridgeViewController.swift est déjà dans la Sources build phase, donc
// la classe ci-dessous est compilée automatiquement avec le target.
//
// API JS : await AlarmSound.playRestEnd() / await AlarmSound.stop()
//
// Pourquoi un plugin natif et pas Web Audio :
//   1. AudioContext en WKWebView démarre suspended → besoin d'un user gesture
//      récent pour resume(). Au bout de 90s de repos, le gesture initial peut
//      être expiré → pas de son.
//   2. AVAudioSession globale de l'app est .playAndRecord (.defaultToSpeaker)
//      pour permettre getUserMedia (notes vocales coach). Cette catégorie
//      RESPECTE le silent switch → mode silencieux = pas de son Web Audio.
//   3. Bascule temporaire vers .playback (qui IGNORE le silent switch) puis
//      restauration → garantit un son audible dans toutes les configs sauf
//      mode Concentration "Ne pas déranger" stricte.

@objc(AlarmSoundPlugin)
public class AlarmSoundPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AlarmSoundPlugin"
    public let jsName = "AlarmSound"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "playRestEnd", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startKeepalive", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopKeepalive", returnType: CAPPluginReturnPromise),
    ]

    private var player: AVAudioPlayer?
    // Keepalive player : joue rb_alarm.caf en volume 0, loop infini, pendant
    // le repos. Sert UNIQUEMENT à empêcher iOS de killer l'app quand le user
    // sort sur Insta/Music pendant son repos. Sans ça, iOS récupère la mémoire
    // après ~30s background → cold-launch au tap de la notif fin de repos →
    // user voit un écran de chargement noir.
    // Requiert UIBackgroundModes "audio" dans Info.plist.
    private var keepalivePlayer: AVAudioPlayer?

    @objc func playRestEnd(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            guard let url = Bundle.main.url(forResource: "rb_alarm", withExtension: "caf") else {
                call.reject("rb_alarm.caf not found in bundle")
                return
            }
            // Stop keepalive avant l'alarme pour éviter conflit de session
            self.keepalivePlayer?.stop()
            self.keepalivePlayer = nil
            do {
                // Bascule en .playback pour bypass silent switch. .duckOthers
                // baisse la musique en cours sans la couper.
                let session = AVAudioSession.sharedInstance()
                try session.setCategory(.playback, mode: .default, options: [.duckOthers])
                try session.setActive(true, options: [])

                self.player?.stop()
                let p = try AVAudioPlayer(contentsOf: url)
                p.numberOfLoops = 1   // 2 cycles × 2.06s ≈ 4.1s — vraie alarme audible
                p.volume = 1.0
                p.prepareToPlay()
                p.play()
                self.player = p

                // Auto-restore session après la fin de la lecture (~4.1s + marge).
                // Sans ça, getUserMedia reste KO ensuite (notes vocales coach).
                DispatchQueue.main.asyncAfter(deadline: .now() + 5.0) { [weak self] in
                    self?.restoreSession()
                }
                call.resolve()
            } catch {
                call.reject("Failed to play alarm: \(error.localizedDescription)")
            }
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            self?.player?.stop()
            self?.player = nil
            self?.keepalivePlayer?.stop()
            self?.keepalivePlayer = nil
            self?.restoreSession()
            call.resolve()
        }
    }

    @objc func startKeepalive(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            // Si déjà actif on resolve direct (idempotent)
            if let kp = self.keepalivePlayer, kp.isPlaying {
                call.resolve()
                return
            }
            guard let url = Bundle.main.url(forResource: "rb_alarm", withExtension: "caf") else {
                call.reject("rb_alarm.caf not found in bundle")
                return
            }
            do {
                // .playback + .mixWithOthers : on n'interrompt PAS la musique de
                // l'user (Spotify continue en A2DP). Le silent switch ne s'applique
                // pas mais comme volume = 0 c'est silencieux de toute manière.
                let session = AVAudioSession.sharedInstance()
                try session.setCategory(.playback, mode: .default, options: [.mixWithOthers])
                try session.setActive(true, options: [])

                let p = try AVAudioPlayer(contentsOf: url)
                p.numberOfLoops = -1   // boucle infinie
                p.volume = 0.0         // silencieux
                p.prepareToPlay()
                p.play()
                self.keepalivePlayer = p
                call.resolve()
            } catch {
                call.reject("Failed to start keepalive: \(error.localizedDescription)")
            }
        }
    }

    @objc func stopKeepalive(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            self?.keepalivePlayer?.stop()
            self?.keepalivePlayer = nil
            // Restaure la session seulement si le player principal n'est pas
            // en train de jouer l'alarme finale.
            if self?.player?.isPlaying != true {
                self?.restoreSession()
            }
            call.resolve()
        }
    }

    private func restoreSession() {
        // Restaure la catégorie .playAndRecord (idem AppDelegate) PUIS désactive
        // explicitement la session → la musique reprend la chaîne audio en A2DP
        // pleine qualité. .allowBluetoothA2DP (pas .allowBluetooth/HFP) pour
        // éviter de dégrader la musique en stéréo basse qualité.
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playAndRecord,
                                    mode: .default,
                                    options: [.defaultToSpeaker, .allowBluetoothA2DP, .mixWithOthers])
            try session.setActive(false, options: [.notifyOthersOnDeactivation])
        } catch {
            // Silent fail — pas critique, prochaine activation tentera de nouveau.
        }
    }
}

// MARK: - RunActivity (Live Activity Dynamic Island pour le run GPS)
//
// Pour les mêmes raisons que AlarmSoundPlugin (target App n'utilise pas de
// PBXFileSystemSynchronizedRootGroup), on inline ici la struct ActivityAttributes
// + le plugin Capacitor. Les copies dans Plugins/RunLiveActivity/ et dans
// RestTimerWidget/ doivent rester identiques (encoding ActivityKit).
//
// API JS :
//   await RunActivity.start({ targetDistanceM?, targetPaceSPerKm?, startedAtMs })
//   await RunActivity.update({ distanceM, durationS, paceSPerKm, isPaused })
//   await RunActivity.end()

@available(iOS 16.1, *)
public struct RunActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        public var distanceM: Double
        public var durationS: Double
        public var paceSPerKm: Double
        public var isPaused: Bool
        public var targetDistanceM: Double
        public var targetPaceSPerKm: Double
        public var startedAt: Date

        public init(
            distanceM: Double,
            durationS: Double,
            paceSPerKm: Double,
            isPaused: Bool,
            targetDistanceM: Double,
            targetPaceSPerKm: Double,
            startedAt: Date
        ) {
            self.distanceM = distanceM
            self.durationS = durationS
            self.paceSPerKm = paceSPerKm
            self.isPaused = isPaused
            self.targetDistanceM = targetDistanceM
            self.targetPaceSPerKm = targetPaceSPerKm
            self.startedAt = startedAt
        }
    }

    public var sessionId: String

    public init(sessionId: String) {
        self.sessionId = sessionId
    }
}

@objc(RunActivityPlugin)
public class RunActivityPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "RunActivityPlugin"
    public let jsName = "RunActivity"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "update", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "end", returnType: CAPPluginReturnPromise),
    ]

    @objc func start(_ call: CAPPluginCall) {
        if #available(iOS 16.1, *) {
            let targetDist = call.getDouble("targetDistanceM") ?? 0
            let targetPace = call.getDouble("targetPaceSPerKm") ?? 0
            let startedAtMs = call.getDouble("startedAtMs") ?? Date().timeIntervalSince1970 * 1000
            let startedAt = Date(timeIntervalSince1970: startedAtMs / 1000)
            let sessionId = UUID().uuidString

            let attributes = RunActivityAttributes(sessionId: sessionId)
            let state = RunActivityAttributes.ContentState(
                distanceM: 0,
                durationS: 0,
                paceSPerKm: 0,
                isPaused: false,
                targetDistanceM: targetDist,
                targetPaceSPerKm: targetPace,
                startedAt: startedAt
            )

            do {
                if #available(iOS 16.2, *) {
                    let content = ActivityContent(state: state, staleDate: nil)
                    let activity = try Activity.request(
                        attributes: attributes,
                        content: content,
                        pushType: nil
                    )
                    call.resolve(["sessionId": sessionId, "activityId": activity.id])
                } else {
                    let activity = try Activity.request(
                        attributes: attributes,
                        contentState: state,
                        pushType: nil
                    )
                    call.resolve(["sessionId": sessionId, "activityId": activity.id])
                }
            } catch {
                call.reject("Failed to start run activity: \(error.localizedDescription)")
            }
        } else {
            call.resolve(["sessionId": "", "activityId": "", "supported": false])
        }
    }

    @objc func update(_ call: CAPPluginCall) {
        if #available(iOS 16.1, *) {
            let distanceM = call.getDouble("distanceM") ?? 0
            let durationS = call.getDouble("durationS") ?? 0
            let paceSPerKm = call.getDouble("paceSPerKm") ?? 0
            let isPaused = call.getBool("isPaused") ?? false

            Task {
                for activity in Activity<RunActivityAttributes>.activities {
                    let prev: RunActivityAttributes.ContentState
                    if #available(iOS 16.2, *) {
                        prev = activity.content.state
                    } else {
                        prev = activity.contentState
                    }
                    let next = RunActivityAttributes.ContentState(
                        distanceM: distanceM,
                        durationS: durationS,
                        paceSPerKm: paceSPerKm,
                        isPaused: isPaused,
                        targetDistanceM: prev.targetDistanceM,
                        targetPaceSPerKm: prev.targetPaceSPerKm,
                        startedAt: prev.startedAt
                    )
                    if #available(iOS 16.2, *) {
                        await activity.update(ActivityContent(state: next, staleDate: nil))
                    } else {
                        await activity.update(using: next)
                    }
                }
                call.resolve()
            }
        } else {
            call.resolve()
        }
    }

    @objc func end(_ call: CAPPluginCall) {
        if #available(iOS 16.1, *) {
            Task {
                for activity in Activity<RunActivityAttributes>.activities {
                    if #available(iOS 16.2, *) {
                        let prev = activity.content.state
                        let final = ActivityContent(state: prev, staleDate: Date().addingTimeInterval(2))
                        await activity.end(final, dismissalPolicy: .after(Date().addingTimeInterval(2)))
                    } else {
                        await activity.end(dismissalPolicy: .immediate)
                    }
                }
                call.resolve()
            }
        } else {
            call.resolve()
        }
    }
}
