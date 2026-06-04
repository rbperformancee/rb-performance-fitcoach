// RestTimerActivityPlugin.swift
// RB Perform — Plugin Capacitor pour démarrer/arrêter le Live Activity rest timer
//
// API JS exposée :
//   await RestTimerActivity.start({ durationSec, nextExerciseName, setLabel })
//   await RestTimerActivity.stop()
//
// Utilisé depuis RestTimer.jsx pour afficher le décompte LIVE dans la Dynamic
// Island + Lock Screen pendant le repos.

import Foundation
import Capacitor
import ActivityKit

@objc(RestTimerActivityPlugin)
public class RestTimerActivityPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "RestTimerActivityPlugin"
    public let jsName = "RestTimerActivity"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
    ]

    private var currentActivityId: String?

    @objc func start(_ call: CAPPluginCall) {
        guard #available(iOS 16.1, *) else {
            call.reject("Live Activities require iOS 16.1+")
            return
        }
        // Vérifie que l'user a activé les Live Activities dans Réglages
        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            call.reject("Live Activities disabled in Settings")
            return
        }

        let durationSec = call.getDouble("durationSec") ?? 90
        let nextExerciseName = call.getString("nextExerciseName") ?? ""
        let setLabel = call.getString("setLabel") ?? ""

        let endDate = Date().addingTimeInterval(durationSec)
        let attributes = RestTimerAttributes(sessionId: UUID().uuidString)
        let contentState = RestTimerAttributes.ContentState(
            endDate: endDate,
            nextExerciseName: nextExerciseName,
            setLabel: setLabel
        )

        // Stop tout précédent activity avant de démarrer un nouveau.
        Task {
            await self.endAllExistingActivities()
            do {
                // iOS 16.2+ : API ActivityContent avec staleDate. iOS
                // auto-marque l'activity comme stale 3s apres endDate, ce
                // qui dismisse la pastille Dynamic Island meme si le JS
                // n'a pas pu appeler stop() (app backgrounded, throttled).
                // Sans staleDate, la pastille reste affichee a 0:00 indefiniment.
                let activity: Activity<RestTimerAttributes>
                if #available(iOS 16.2, *) {
                    let content = ActivityContent(
                        state: contentState,
                        staleDate: endDate.addingTimeInterval(3)
                    )
                    activity = try Activity<RestTimerAttributes>.request(
                        attributes: attributes,
                        content: content,
                        pushType: nil
                    )
                } else {
                    // iOS 16.1 fallback : pas de staleDate. La pastille
                    // restera affichee jusqu'a stop() explicite (JS ou unmount).
                    activity = try Activity<RestTimerAttributes>.request(
                        attributes: attributes,
                        contentState: contentState,
                        pushType: nil
                    )
                }
                self.currentActivityId = activity.id
                call.resolve(["activityId": activity.id])
            } catch {
                call.reject("Failed to start activity: \(error.localizedDescription)")
            }
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        guard #available(iOS 16.1, *) else {
            call.resolve()
            return
        }
        Task {
            await self.endAllExistingActivities()
            self.currentActivityId = nil
            call.resolve()
        }
    }

    @available(iOS 16.1, *)
    private func endAllExistingActivities() async {
        // API iOS 16.1 : end(dismissalPolicy:) sans paramètre contenu.
        // iOS 16.2+ a la signature end(_:dismissalPolicy:) mais on reste compat 16.1.
        for activity in Activity<RestTimerAttributes>.activities {
            await activity.end(dismissalPolicy: .immediate)
        }
    }
}
