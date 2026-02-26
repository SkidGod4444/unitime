import ExpoModulesCore
import UserNotifications

// ─────────────────────────────────────────────────────────────────────────────
// ExpoAlarmKitModule — iOS
//
// Uses UNUserNotificationCenter to schedule alarms.
// interruptionLevel = .critical bypasses silent mode / DnD on iOS 15+.
// ─────────────────────────────────────────────────────────────────────────────

public class ExpoAlarmKitModule: Module, UNUserNotificationCenterDelegate {

    private let center = UNUserNotificationCenter.current()

    public func definition() -> ModuleDefinition {
        Name("ExpoAlarmKit")

        Events("alarmTriggered", "alarmDismissed")

        OnCreate {
            center.delegate = self
        }

        // ── isSupported ───────────────────────────────────────────────────────
        Function("isSupported") { return true }

        // ── requestPermissionsAsync ───────────────────────────────────────────
        AsyncFunction("requestPermissionsAsync") { (promise: Promise) in
            let options: UNAuthorizationOptions = [.alert, .sound, .badge]
            center.requestAuthorization(options: options) { granted, _ in
                promise.resolve(["granted": granted, "canAskAgain": !granted])
            }
        }

        // ── getPermissionsAsync ───────────────────────────────────────────────
        AsyncFunction("getPermissionsAsync") { (promise: Promise) in
            center.getNotificationSettings { settings in
                let granted = settings.authorizationStatus == .authorized ||
                              settings.authorizationStatus == .provisional
                promise.resolve(["granted": granted, "canAskAgain": !granted])
            }
        }

        // ── scheduleAlarmAsync ────────────────────────────────────────────────
        AsyncFunction("scheduleAlarmAsync") { (alarmData: [String: Any], promise: Promise) in
            guard
                let identifier = alarmData["identifier"] as? String,
                let title      = alarmData["title"] as? String,
                let dateMillis = alarmData["date"] as? Double
            else {
                promise.reject("ERR_INVALID_INPUT", "identifier, title, and date are required")
                return
            }

            let body     = alarmData["body"] as? String ?? ""
            let fireDate = Date(timeIntervalSince1970: dateMillis / 1000.0)

            let content = UNMutableNotificationContent()
            content.title = title
            content.body  = body
            content.sound = UNNotificationSound.defaultCriticalSound(withAudioVolume: 1.0)
            // Critical interruption — bypasses silent mode and DnD (requires entitlement for App Store)
            if #available(iOS 15.0, *) {
                content.interruptionLevel = .critical
            }
            content.userInfo = ["identifier": identifier]

            let components = Calendar.current.dateComponents(
                [.year, .month, .day, .hour, .minute, .second],
                from: fireDate
            )
            let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: false)
            let request = UNNotificationRequest(identifier: identifier, content: content, trigger: trigger)

            // Cancel any existing with same ID then add new
            center.removePendingNotificationRequests(withIdentifiers: [identifier])
            center.add(request) { error in
                if let error = error {
                    promise.reject("ERR_ALARM_SCHEDULE", error.localizedDescription)
                } else {
                    promise.resolve(nil)
                }
            }
        }

        // ── cancelAlarmAsync ──────────────────────────────────────────────────
        AsyncFunction("cancelAlarmAsync") { (identifier: String, promise: Promise) in
            center.removePendingNotificationRequests(withIdentifiers: [identifier])
            center.removeDeliveredNotifications(withIdentifiers: [identifier])
            promise.resolve(nil)
        }

        // ── cancelAllAlarmsAsync ──────────────────────────────────────────────
        AsyncFunction("cancelAllAlarmsAsync") { (promise: Promise) in
            center.removeAllPendingNotificationRequests()
            center.removeAllDeliveredNotifications()
            promise.resolve(nil)
        }

        // ── hasAlarmAsync ─────────────────────────────────────────────────────
        AsyncFunction("hasAlarmAsync") { (identifier: String, promise: Promise) in
            center.getPendingNotificationRequests { requests in
                promise.resolve(requests.contains { $0.identifier == identifier })
            }
        }
    }

    // ── UNUserNotificationCenterDelegate ─────────────────────────────────────

    /// Called when a notification is delivered while the app is in the foreground.
    public func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        let id = notification.request.identifier
        sendEvent("alarmTriggered", ["identifier": id])
        // Show banner + play sound even in foreground
        if #available(iOS 14.0, *) {
            completionHandler([.banner, .sound, .badge])
        } else {
            completionHandler([.alert, .sound, .badge])
        }
    }

    /// Called when the user taps the notification (app was backgrounded).
    public func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let id = response.notification.request.identifier
        if response.actionIdentifier == UNNotificationDismissActionIdentifier {
            sendEvent("alarmDismissed", ["identifier": id])
        } else {
            sendEvent("alarmTriggered", ["identifier": id])
        }
        completionHandler()
    }
}
