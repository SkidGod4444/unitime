package expo.modules.alarmkit

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Build
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ExpoAlarmKitModule : Module() {

    private val context: Context
        get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

    private val alarmManager: AlarmManager
        get() = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

    private val prefs: SharedPreferences
        get() = context.getSharedPreferences("ExpoAlarmKit", Context.MODE_PRIVATE)

    private val gson = Gson()

    override fun definition() = ModuleDefinition {
        Name("ExpoAlarmKit")

        // Events emitted from AlarmReceiver → AlarmActivity → JS bridge
        Events("alarmTriggered", "alarmDismissed")

        // ── isSupported ───────────────────────────────────────────────────────
        Function("isSupported") { true }

        // ── requestPermissionsAsync ───────────────────────────────────────────
        AsyncFunction("requestPermissionsAsync") { promise: Promise ->
            val granted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                alarmManager.canScheduleExactAlarms()
            } else {
                true
            }
            promise.resolve(mapOf("granted" to granted, "canAskAgain" to !granted))
        }

        // ── getPermissionsAsync ───────────────────────────────────────────────
        AsyncFunction("getPermissionsAsync") { promise: Promise ->
            val granted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                alarmManager.canScheduleExactAlarms()
            } else {
                true
            }
            promise.resolve(mapOf("granted" to granted, "canAskAgain" to !granted))
        }

        // ── scheduleAlarmAsync ────────────────────────────────────────────────
        AsyncFunction("scheduleAlarmAsync") { alarmData: Map<String, Any>, promise: Promise ->
            try {
                val identifier  = alarmData["identifier"] as String
                val title       = alarmData["title"] as String
                val body        = alarmData["body"] as? String
                val dateMillis  = (alarmData["date"] as Double).toLong()
                val repeating   = alarmData["repeating"] as? Boolean ?: false
                val repeatInterval = (alarmData["repeatInterval"] as? Double)?.toLong()

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
                    !alarmManager.canScheduleExactAlarms()
                ) {
                    promise.reject("ERR_NO_PERMISSION", "Exact alarm permission not granted", null)
                    return@AsyncFunction
                }

                // Cancel any existing alarm with the same identifier
                cancelAlarmInternal(identifier)

                // The broadcast targets AlarmReceiver which posts the FSI notification
                val intent = Intent(context, AlarmReceiver::class.java).apply {
                    putExtra("identifier", identifier)
                    putExtra("title", title)
                    putExtra("body", body)
                    putExtra("repeating", repeating)
                    if (repeatInterval != null) putExtra("repeatInterval", repeatInterval)
                }

                val pendingIntent = PendingIntent.getBroadcast(
                    context,
                    identifier.hashCode(),
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )

                if (repeating && repeatInterval != null) {
                    alarmManager.setRepeating(
                        AlarmManager.RTC_WAKEUP,
                        dateMillis,
                        repeatInterval,
                        pendingIntent
                    )
                } else {
                    alarmManager.setExactAndAllowWhileIdle(
                        AlarmManager.RTC_WAKEUP,
                        dateMillis,
                        pendingIntent
                    )
                }

                // Persist so BootReceiver can re-schedule after reboot
                saveAlarm(identifier, mapOf(
                    "identifier" to identifier,
                    "title" to title,
                    "body" to (body ?: ""),
                    "date" to dateMillis,
                    "repeating" to repeating,
                    "repeatInterval" to (repeatInterval ?: 0L)
                ))

                promise.resolve(null)
            } catch (e: Exception) {
                promise.reject("ERR_ALARM_SCHEDULE", e.message, e)
            }
        }

        // ── cancelAlarmAsync ──────────────────────────────────────────────────
        AsyncFunction("cancelAlarmAsync") { identifier: String, promise: Promise ->
            try {
                cancelAlarmInternal(identifier)
                promise.resolve(null)
            } catch (e: Exception) {
                promise.reject("ERR_ALARM_CANCEL", e.message, e)
            }
        }

        // ── cancelAllAlarmsAsync ──────────────────────────────────────────────
        AsyncFunction("cancelAllAlarmsAsync") { promise: Promise ->
            try {
                getAllAlarms().keys.forEach { cancelAlarmInternal(it) }
                prefs.edit().clear().apply()
                promise.resolve(null)
            } catch (e: Exception) {
                promise.reject("ERR_ALARM_CANCEL_ALL", e.message, e)
            }
        }

        // ── hasAlarmAsync ─────────────────────────────────────────────────────
        AsyncFunction("hasAlarmAsync") { identifier: String, promise: Promise ->
            promise.resolve(prefs.contains("alarm_$identifier"))
        }
    }

    // ── Internal helpers ──────────────────────────────────────────────────────

    internal fun cancelAlarmInternal(identifier: String) {
        val intent = Intent(context, AlarmReceiver::class.java)
        val pi = PendingIntent.getBroadcast(
            context,
            identifier.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        alarmManager.cancel(pi)
        prefs.edit().remove("alarm_$identifier").apply()
    }

    private fun saveAlarm(identifier: String, info: Map<String, Any?>) {
        prefs.edit().putString("alarm_$identifier", gson.toJson(info)).apply()
    }

    internal fun getAllAlarms(): Map<String, Map<String, Any?>> {
        val type = object : TypeToken<Map<String, Any?>>() {}.type
        return prefs.all
            .filter { it.key.startsWith("alarm_") && it.value is String }
            .mapKeys { it.key.removePrefix("alarm_") }
            .mapValues { gson.fromJson(it.value as String, type) }
    }
}
