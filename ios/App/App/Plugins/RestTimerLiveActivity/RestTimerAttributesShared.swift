import ActivityKit
import Foundation

@available(iOS 16.1, *)
public struct RestTimerAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        public var endDate: Date
        public var nextExerciseName: String
        public var setLabel: String
        public init(endDate: Date, nextExerciseName: String, setLabel: String) {
            self.endDate = endDate
            self.nextExerciseName = nextExerciseName
            self.setLabel = setLabel
        }
    }
    public var sessionId: String
    public init(sessionId: String) { self.sessionId = sessionId }
}
