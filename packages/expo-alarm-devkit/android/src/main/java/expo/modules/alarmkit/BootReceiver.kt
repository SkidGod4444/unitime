package expo.modules.alarmkit

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.app.AlarmManager
import android.app.PendingIntent
import android.os.Build
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken

/**
 * BootReceiver — re-schedules all persisted alarms after device reboot,
 * because AlarmManager alarms are cleared when the device powers off.
 */
class BootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED) return

        val prefs = context.getSharedPreferences("ExpoAlarmKit", Context.MODE_PRIVATE)
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val gson = Gson()
        val type = object : TypeToken<Map<String, Any?>>() {}.type
        val now = System.currentTimeMillis()

        prefs.all
            .filter { it.key.startsWith("alarm_") && it.value is String }
            .forEach { (key, value) ->
                try {
                    val info: Map<String, Any?> = gson.fromJson(value as String, type)
                    val identifier = info["identifier"] as? String ?: return@forEach
                    val title = info["title"] as? String ?: "⏰ Alarm"
                    val body = info["body"] as? String
                    val dateMillis = (info["date"] as? Double)?.toLong() ?: return@forEach
                    val repeating = info["repeating"] as? Boolean ?: false
                    val repeatInterval = (info["repeatInterval"] as? Double)?.toLong()

                    // Skip one-time alarms that already fired
                    if (!repeating && dateMillis <= now) {
                        prefs.edit().remove(key).apply()
                        return@forEach
                    }

                    val broadcastIntent = Intent(context, AlarmReceiver::class.java).apply {
                        putExtra("identifier", identifier)
                        putExtra("title", title)
                        putExtra("body", body)
                        putExtra("repeating", repeating)
                        if (repeatInterval != null) putExtra("repeatInterval", repeatInterval)
                    }

                    val pi = PendingIntent.getBroadcast(
                        context,
                        identifier.hashCode(),
                        broadcastIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )

                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
                        !alarmManager.canScheduleExactAlarms()
                    ) return@forEach

                    if (repeating && repeatInterval != null) {
                        alarmManager.setRepeating(
                            AlarmManager.RTC_WAKEUP, dateMillis, repeatInterval, pi
                        )
                    } else {
                        alarmManager.setExactAndAllowWhileIdle(
                            AlarmManager.RTC_WAKEUP, dateMillis, pi
                        )
                    }
                } catch (_: Exception) { /* Skip malformed entries */ }
            }
    }
}
