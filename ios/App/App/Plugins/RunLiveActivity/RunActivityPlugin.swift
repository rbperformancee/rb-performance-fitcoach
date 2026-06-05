// RunActivityPlugin.swift
// RB Perform — Plugin Live Activity pour le tracker de course.
//
// API JS :
//   await RunActivity.start({ targetDistanceM?, targetPaceSPerKm?, startedAtMs })
//   await RunActivity.update({ distanceM, durationS, paceSPerKm, isPaused })
//   await RunActivity.end()
//
// Sur iOS < 16.1 → no-op silencieux (les méthodes résolvent immédiatement).

import Foundation
import Capacitor
import ActivityKit

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
