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
        // TODO Phase 3 polish : registerPluginInstance(RunActivityPlugin())
        // après ajout du fichier au target App via xcodeproj (synchronized
        // groups pas configurés pour Plugins/, ajout manuel requis).
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
    ]

    private var player: AVAudioPlayer?

    @objc func playRestEnd(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            guard let url = Bundle.main.url(forResource: "rb_alarm", withExtension: "caf") else {
                call.reject("rb_alarm.caf not found in bundle")
                return
            }
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
            self?.restoreSession()
            call.resolve()
        }
    }

    private func restoreSession() {
        // Restaure la catégorie .playAndRecord configurée par AppDelegate
        // (nécessaire pour getUserMedia côté JS).
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playAndRecord,
                                    mode: .default,
                                    options: [.defaultToSpeaker, .allowBluetooth, .mixWithOthers])
            try session.setActive(true, options: [.notifyOthersOnDeactivation])
        } catch {
            // Silent fail — pas critique, prochaine activation tentera de nouveau.
        }
    }
}
