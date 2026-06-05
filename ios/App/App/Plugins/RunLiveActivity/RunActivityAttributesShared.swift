// RunActivityAttributesShared.swift
// RB Perform — Copie de RunActivityAttributes dans le target principal de l'app
//
// Le widget extension ET le target main app ont besoin de la même struct
// ActivityAttributes pour encoder/décoder la state du run. Comme un seul
// fichier ne peut pas appartenir à 2 targets en SPM, on duplique.

import ActivityKit
import Foundation

@available(iOS 16.1, *)
public struct RunActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        public var distanceM: Double
        public var durationS: Double
        public var paceSPerKm: Double      // 0 si non calculable
        public var isPaused: Bool
        public var targetDistanceM: Double // 0 si pas de cible coach
        public var targetPaceSPerKm: Double // 0 si pas de cible
        public var startedAt: Date          // pour Text(timerInterval:) live

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
