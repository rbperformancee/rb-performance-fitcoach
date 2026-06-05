// HealthStepsPlugin.swift
// RB Perform — Plugin Capacitor custom pour HealthKit
//
// 1. Read : pas du jour
// 2. Write : workout running (HKWorkout) avec distance + durée + route GPS
//
// Plus fiable que capacitor-health 8.1.2 qui retourne parfois 0 ou null
// sur des configs récentes.
//
// API JS :
//   await HealthSteps.requestPermission()              // legacy : read steps
//   await HealthSteps.getTodaySteps() → { steps }
//   await HealthSteps.requestWorkoutPermission()       // write workout
//   await HealthSteps.saveRunWorkout({ distanceM, durationS, startedAt, endedAt, routeCoords })

import Foundation
import Capacitor
import HealthKit
import CoreLocation

@objc(HealthStepsPlugin)
public class HealthStepsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "HealthStepsPlugin"
    public let jsName = "HealthSteps"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "requestPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getTodaySteps", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestWorkoutPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "saveRunWorkout", returnType: CAPPluginReturnPromise),
    ]

    private let store = HKHealthStore()

    @objc func requestPermission(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("HealthKit not available on this device")
            return
        }
        guard let stepType = HKQuantityType.quantityType(forIdentifier: .stepCount) else {
            call.reject("Step count type unavailable")
            return
        }
        store.requestAuthorization(toShare: nil, read: [stepType]) { success, error in
            if let error = error {
                call.reject("Request failed: \(error.localizedDescription)")
                return
            }
            // success ne reflète PAS si l'user a accepté (privacy by design Apple).
            // On résout toujours true — le lookup retournera 0 si refusé.
            call.resolve(["granted": success])
        }
    }

    @objc func getTodaySteps(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.resolve(["steps": 0])
            return
        }
        guard let stepType = HKQuantityType.quantityType(forIdentifier: .stepCount) else {
            call.resolve(["steps": 0])
            return
        }
        let calendar = Calendar.current
        let startOfDay = calendar.startOfDay(for: Date())
        let now = Date()
        let predicate = HKQuery.predicateForSamples(withStart: startOfDay, end: now, options: .strictStartDate)
        let query = HKStatisticsQuery(quantityType: stepType,
                                      quantitySamplePredicate: predicate,
                                      options: .cumulativeSum) { _, result, error in
            if let error = error {
                call.reject("Query failed: \(error.localizedDescription)")
                return
            }
            let total = result?.sumQuantity()?.doubleValue(for: HKUnit.count()) ?? 0
            call.resolve(["steps": Int(total)])
        }
        store.execute(query)
    }

    /// Demande l'autorisation d'écrire un workout running + sa route GPS.
    /// Apple n'expose pas l'état réel (privacy) — on résout true si l'appel a réussi.
    @objc func requestWorkoutPermission(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("HealthKit not available on this device")
            return
        }
        let writeTypes: Set<HKSampleType> = [
            HKObjectType.workoutType(),
            HKSeriesType.workoutRoute(),
            HKQuantityType.quantityType(forIdentifier: .distanceWalkingRunning)!,
            HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned)!,
        ]
        store.requestAuthorization(toShare: writeTypes, read: nil) { success, error in
            if let error = error {
                call.reject("Workout perm failed: \(error.localizedDescription)")
                return
            }
            call.resolve(["granted": success])
        }
    }

    /// Sauvegarde un workout running dans Apple Health.
    /// args: { distanceM:Number, durationS:Number, startedAt:Number(seconds), endedAt:Number(seconds), routeCoords:[{lat,lng,alt?,t?}] }
    @objc func saveRunWorkout(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("HealthKit not available on this device")
            return
        }

        let distanceM = call.getDouble("distanceM") ?? 0
        let durationS = call.getDouble("durationS") ?? 0
        let startedAtSec = call.getDouble("startedAt") ?? Date().timeIntervalSince1970 - durationS
        let endedAtSec = call.getDouble("endedAt") ?? Date().timeIntervalSince1970
        let routeArr = call.getArray("routeCoords") ?? []

        guard distanceM > 50, durationS > 5 else {
            call.reject("Workout too short to save (< 50m or < 5s)")
            return
        }

        let startDate = Date(timeIntervalSince1970: startedAtSec)
        let endDate = Date(timeIntervalSince1970: endedAtSec)

        // Estimation calories : 0.063 kcal/m pour running modéré (homme 75kg).
        // Approximatif mais Apple l'affiche comme metric secondaire.
        let kcal = distanceM * 0.063
        let energyQty = HKQuantity(unit: .kilocalorie(), doubleValue: kcal)
        let distanceQty = HKQuantity(unit: .meter(), doubleValue: distanceM)

        // 1. Créer le workout
        let workout = HKWorkout(
            activityType: .running,
            start: startDate,
            end: endDate,
            duration: durationS,
            totalEnergyBurned: energyQty,
            totalDistance: distanceQty,
            metadata: [HKMetadataKeyIndoorWorkout: false]
        )

        store.save(workout) { [weak self] success, error in
            if let error = error {
                call.reject("Save workout failed: \(error.localizedDescription)")
                return
            }
            guard success else {
                call.reject("Save workout returned false")
                return
            }

            // 2. Ajouter samples distance + énergie associés (Apple Watch les affiche)
            self?.attachQuantitySamples(
                to: workout,
                distance: distanceQty, energy: energyQty,
                start: startDate, end: endDate
            )

            // 3. Sauver la route GPS si fournie (≥ 2 points)
            let coordDicts: [[String: Any]] = routeArr.compactMap { $0 as? [String: Any] }
            if coordDicts.count >= 2 {
                self?.saveRouteForWorkout(workout, coords: coordDicts) { routeOk in
                    call.resolve([
                        "saved": true,
                        "withRoute": routeOk,
                        "kcal": Int(kcal),
                    ])
                }
            } else {
                call.resolve(["saved": true, "withRoute": false, "kcal": Int(kcal)])
            }
        }
    }

    // MARK: - Helpers

    private func attachQuantitySamples(
        to workout: HKWorkout,
        distance: HKQuantity, energy: HKQuantity,
        start: Date, end: Date
    ) {
        var samples: [HKSample] = []
        if let dType = HKQuantityType.quantityType(forIdentifier: .distanceWalkingRunning) {
            samples.append(HKQuantitySample(type: dType, quantity: distance, start: start, end: end))
        }
        if let eType = HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned) {
            samples.append(HKQuantitySample(type: eType, quantity: energy, start: start, end: end))
        }
        if !samples.isEmpty {
            store.add(samples, to: workout) { _, _ in /* best effort */ }
        }
    }

    private func saveRouteForWorkout(
        _ workout: HKWorkout,
        coords: [[String: Any]],
        completion: @escaping (Bool) -> Void
    ) {
        let builder = HKWorkoutRouteBuilder(healthStore: store, device: nil)
        var locations: [CLLocation] = []
        let baseTime = workout.startDate
        for (i, c) in coords.enumerated() {
            guard let lat = c["lat"] as? Double, let lng = c["lng"] as? Double else { continue }
            let alt = c["alt"] as? Double ?? 0
            let tOffsetMs = c["t"] as? Double ?? Double(i) * 1000
            let ts = baseTime.addingTimeInterval(tOffsetMs / 1000.0)
            let loc = CLLocation(
                coordinate: CLLocationCoordinate2D(latitude: lat, longitude: lng),
                altitude: alt,
                horizontalAccuracy: 5,
                verticalAccuracy: 5,
                timestamp: ts
            )
            locations.append(loc)
        }
        guard locations.count >= 2 else {
            completion(false)
            return
        }
        builder.insertRouteData(locations) { ok, _ in
            guard ok else { completion(false); return }
            builder.finishRoute(with: workout, metadata: nil) { route, _ in
                completion(route != nil)
            }
        }
    }
}
