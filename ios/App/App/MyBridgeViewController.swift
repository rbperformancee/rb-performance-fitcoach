// MyBridgeViewController.swift
// RB Perform — Subclasse de CAPBridgeViewController pour enregistrer les
// plugins Capacitor custom qui ne sont pas dans un Swift Package séparé.
//
// En Capacitor 8 + SPM, les plugins externes sont auto-discovered via
// Package.swift. Les plugins custom dans le target App doivent être
// enregistrés manuellement ici via `bridge?.registerPluginInstance(...)`.

import UIKit
import Capacitor

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
    }
}
