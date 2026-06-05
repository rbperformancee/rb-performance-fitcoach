// RunLiveActivity.swift
// RB Perform — Widget Live Activity pour le tracker de course.
//
// Affiche distance / pace / chrono live pendant le run.
// - Lock Screen : carte large avec distance + chrono + allure
// - Dynamic Island (3 modes) : minimal / compact / expanded
//
// iOS calcule automatiquement le chrono via Text(timerInterval:)
// → pas de polling, pas de batterie.

import ActivityKit
import WidgetKit
import SwiftUI

@available(iOS 16.1, *)
struct RunLiveActivity: Widget {
    static let teal = Color(red: 0.008, green: 0.82, blue: 0.73)
    static let red = Color(red: 0.94, green: 0.27, blue: 0.27)

    var body: some WidgetConfiguration {
        ActivityConfiguration(for: RunActivityAttributes.self) { context in
            // ============ LOCK SCREEN UI ============
            VStack(spacing: 0) {
                HStack(alignment: .center, spacing: 14) {
                    // Icone + state
                    ZStack {
                        Circle()
                            .fill(context.state.isPaused
                                  ? Color.yellow.opacity(0.18)
                                  : RunLiveActivity.teal.opacity(0.18))
                            .frame(width: 56, height: 56)
                        Image(systemName: context.state.isPaused ? "pause.fill" : "figure.run")
                            .font(.system(size: 22, weight: .bold))
                            .foregroundColor(context.state.isPaused ? .yellow : RunLiveActivity.teal)
                    }

                    VStack(alignment: .leading, spacing: 4) {
                        Text(context.state.isPaused ? "RUN EN PAUSE" : "RUN EN COURS")
                            .font(.system(size: 9, weight: .heavy))
                            .tracking(2)
                            .foregroundColor(context.state.isPaused ? .yellow : RunLiveActivity.teal)
                        HStack(alignment: .firstTextBaseline, spacing: 6) {
                            Text(formatDistance(context.state.distanceM))
                                .font(.system(size: 24, weight: .heavy, design: .rounded))
                                .foregroundColor(.white)
                            Text("km")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundColor(.white.opacity(0.6))
                        }
                        if context.state.paceSPerKm > 0 {
                            Text("\(formatPace(context.state.paceSPerKm)) /km")
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(.white.opacity(0.7))
                        }
                    }
                    Spacer()

                    // Chrono live
                    VStack(alignment: .trailing, spacing: 2) {
                        if context.state.isPaused {
                            Text(formatDuration(context.state.durationS))
                                .font(.system(size: 22, weight: .bold, design: .rounded))
                                .monospacedDigit()
                                .foregroundColor(.white)
                        } else {
                            Text(timerInterval: context.state.startedAt...Date.distantFuture, countsDown: false)
                                .font(.system(size: 22, weight: .bold, design: .rounded))
                                .monospacedDigit()
                                .foregroundColor(.white)
                                .frame(minWidth: 88, alignment: .trailing)
                        }
                        Text("DURÉE")
                            .font(.system(size: 8, weight: .heavy))
                            .tracking(1.5)
                            .foregroundColor(.white.opacity(0.45))
                    }
                }
                .padding(16)
            }
            .activityBackgroundTint(Color(red: 0.02, green: 0.02, blue: 0.02))
            .activitySystemActionForegroundColor(.white)
        } dynamicIsland: { context in
            // ============ DYNAMIC ISLAND ============
            DynamicIsland {
                // EXPANDED (long press)
                DynamicIslandExpandedRegion(.leading) {
                    VStack(alignment: .leading, spacing: 3) {
                        Text("DISTANCE")
                            .font(.system(size: 9, weight: .heavy))
                            .tracking(1.5)
                            .foregroundColor(.white.opacity(0.55))
                        HStack(alignment: .firstTextBaseline, spacing: 3) {
                            Text(formatDistance(context.state.distanceM))
                                .font(.system(size: 22, weight: .heavy, design: .rounded))
                                .foregroundColor(.white)
                            Text("km")
                                .font(.system(size: 11, weight: .bold))
                                .foregroundColor(.white.opacity(0.6))
                        }
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    VStack(alignment: .trailing, spacing: 3) {
                        Text("DURÉE")
                            .font(.system(size: 9, weight: .heavy))
                            .tracking(1.5)
                            .foregroundColor(.white.opacity(0.55))
                        if context.state.isPaused {
                            Text(formatDuration(context.state.durationS))
                                .font(.system(size: 22, weight: .heavy, design: .rounded))
                                .monospacedDigit()
                                .foregroundColor(.yellow)
                        } else {
                            Text(timerInterval: context.state.startedAt...Date.distantFuture, countsDown: false)
                                .font(.system(size: 22, weight: .heavy, design: .rounded))
                                .monospacedDigit()
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity, alignment: .trailing)
                        }
                    }
                }
                DynamicIslandExpandedRegion(.bottom) {
                    HStack {
                        Image(systemName: context.state.isPaused ? "pause.fill" : "figure.run")
                            .foregroundColor(context.state.isPaused ? .yellow : RunLiveActivity.teal)
                        if context.state.paceSPerKm > 0 {
                            Text("\(formatPace(context.state.paceSPerKm)) /km")
                                .font(.system(size: 13, weight: .heavy))
                                .foregroundColor(.white)
                        } else {
                            Text("Calcul de l'allure…")
                                .font(.system(size: 12, weight: .medium))
                                .foregroundColor(.white.opacity(0.5))
                        }
                        Spacer()
                        if context.state.targetPaceSPerKm > 0 && context.state.paceSPerKm > 0 {
                            paceDeltaChip(actual: context.state.paceSPerKm, target: context.state.targetPaceSPerKm)
                        }
                    }
                }
            } compactLeading: {
                Image(systemName: context.state.isPaused ? "pause.fill" : "figure.run")
                    .foregroundColor(context.state.isPaused ? .yellow : RunLiveActivity.teal)
            } compactTrailing: {
                if context.state.isPaused {
                    Text(formatDuration(context.state.durationS))
                        .font(.system(size: 13, weight: .bold, design: .rounded))
                        .monospacedDigit()
                        .foregroundColor(.yellow)
                        .frame(width: 54)
                } else {
                    Text(timerInterval: context.state.startedAt...Date.distantFuture, countsDown: false)
                        .font(.system(size: 13, weight: .bold, design: .rounded))
                        .monospacedDigit()
                        .foregroundColor(.white)
                        .frame(width: 54)
                }
            } minimal: {
                Image(systemName: context.state.isPaused ? "pause.fill" : "figure.run")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(context.state.isPaused ? .yellow : RunLiveActivity.teal)
            }
            .keylineTint(RunLiveActivity.teal)
        }
    }

    @ViewBuilder
    private func paceDeltaChip(actual: Double, target: Double) -> some View {
        let delta = actual - target // négatif = plus rapide
        let absDelta = Int(abs(delta).rounded())
        let sign = delta < 0 ? "−" : "+"
        let color: Color = delta < -5 ? RunLiveActivity.teal : (delta > 15 ? RunLiveActivity.red : .yellow)
        Text("\(sign)\(absDelta)s")
            .font(.system(size: 11, weight: .heavy))
            .foregroundColor(color)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(color.opacity(0.18))
            .cornerRadius(6)
    }
}

// MARK: - Format helpers (dupliqués widget extension)

private func formatDistance(_ m: Double) -> String {
    return String(format: "%.2f", m / 1000).replacingOccurrences(of: ".", with: ",")
}
private func formatDuration(_ s: Double) -> String {
    let total = Int(s)
    let h = total / 3600
    let m = (total % 3600) / 60
    let sec = total % 60
    if h > 0 {
        return String(format: "%d:%02d:%02d", h, m, sec)
    }
    return String(format: "%d:%02d", m, sec)
}
private func formatPace(_ s: Double) -> String {
    guard s > 0, s.isFinite else { return "--:--" }
    let m = Int(s) / 60
    let sec = Int(s) % 60
    return String(format: "%d:%02d", m, sec)
}
