import UIKit
import Capacitor
import AVFoundation
import UserNotifications

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Configure AVAudioSession pour débloquer getUserMedia({audio:true}) dans
        // WKWebView. Sans ça, MediaRecorder côté web reçoit "NotAllowedError" sur
        // certaines versions iOS même si NSMicrophoneUsageDescription est OK.
        //
        // CRITIQUE : .allowBluetooth route via HFP (mono 8kHz, qualité voix)
        // → la musique de l'user devient pourrie quand il ouvre l'app.
        // .allowBluetoothA2DP route via A2DP (stéréo haute qualité, profil
        // musique standard). On veut A2DP par défaut, HFP seulement quand
        // l'user enregistre vraiment une note vocale.
        //
        // De plus, on NE FAIT PAS setActive(true) au boot — ça hijack la
        // chaîne audio du système. Le système active la session à la demande
        // (premier play/record). AlarmSoundPlugin et getUserMedia activent
        // explicitement quand ils ont besoin.
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playAndRecord,
                                    mode: .default,
                                    options: [.defaultToSpeaker, .allowBluetoothA2DP, .mixWithOthers])
            // PAS de setActive(true) ici — laisser dormant pour préserver la
            // qualité musique tant qu'on n'a pas besoin de micro/HP.
        } catch {
            print("[AppDelegate] AVAudioSession setup failed: \(error)")
        }

        // CRITIQUE : force iOS à afficher banner + SON même quand l'app est
        // foreground. Par défaut iOS suppresse les local notifications en
        // foreground → le timer de repos "sonne dans le vide" si l'user a
        // l'app ouverte à l'expiration. Sans ce delegate, aucun son.
        UNUserNotificationCenter.current().delegate = self

        // Désactive le "Shake to Undo" iOS — quand l'athlète secoue le téléphone
        // pendant un run (mouvement naturel), iOS popait un dialogue système
        // "Annuler la saisie / Refaire / Annuler" qui pourrit l'UX en course.
        // applicationSupportsShakeToEdit = false coupe la détection globale.
        application.applicationSupportsShakeToEdit = false

        return true
    }

    // MARK: - UNUserNotificationCenterDelegate

    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        // Foreground : banner + sound + badge.
        if #available(iOS 14.0, *) {
            completionHandler([.banner, .list, .sound, .badge])
        } else {
            completionHandler([.alert, .sound, .badge])
        }
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                didReceive response: UNNotificationResponse,
                                withCompletionHandler completionHandler: @escaping () -> Void) {
        completionHandler()
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

    // MARK: - Push Notifications (APNs)
    //
    // Capacitor 8 utilise NotificationCenter pour forward le token APNs
    // depuis l'AppDelegate vers le plugin PushNotifications. Sans ces deux
    // handlers, le swizzle automatique échoue dès qu'on a custom le
    // didFinishLaunchingWithOptions → didRegisterForRemoteNotifications
    // never fires côté JS → timeout 5s (Rayan, 10 juin 2026).
    //
    // Ref : https://capacitorjs.com/docs/apis/push-notifications#ios

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationCenter.default.post(
            name: .capacitorDidRegisterForRemoteNotifications,
            object: deviceToken
        )
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(
            name: .capacitorDidFailToRegisterForRemoteNotifications,
            object: error
        )
    }

}
