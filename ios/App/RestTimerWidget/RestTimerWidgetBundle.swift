//
//  RestTimerWidgetBundle.swift
//  RestTimerWidget
//
//  Bundle d'entrée du Widget Extension. Ne contient que la Live Activity
//  du timer de repos — pas de widget home screen ni de Control Widget.
//

import WidgetKit
import SwiftUI

@main
struct RestTimerWidgetBundle: WidgetBundle {
    var body: some Widget {
        if #available(iOS 16.1, *) {
            RunLiveActivity()
        }
    }
}
