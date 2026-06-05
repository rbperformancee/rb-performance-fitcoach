// RunActivityAttributes.swift
// Copie côté widget extension de la struct RunActivityAttributes.
// Doit rester strictement identique à
// ios/App/App/Plugins/RunLiveActivity/RunActivityAttributesShared.swift

import ActivityKit
import Foundation

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
