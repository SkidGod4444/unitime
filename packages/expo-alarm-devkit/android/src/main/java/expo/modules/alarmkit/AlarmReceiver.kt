package expo.modules.alarmkit

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

/**
 * AlarmReceiver — woken by AlarmManager at the scheduled fire time.
 *
 * Posts a HIGH-priority notification with a Full-Screen Intent so the
 * AlarmActivity launches over the lock screen. Also sets a contentIntent
 * so tapping from the notification shade opens the same activity.
 */
class AlarmReceiver : BroadcastReceiver() {

    companion object {
        const val CHANNEL_ID   = "expo_alarm_kit_channel"
        const val CHANNEL_NAME = "Class Alarms"
        const val NOTIF_ID_OFFSET = 0x7A1A0000.toInt() // avoid ID collisions
    }

    override fun onReceive(context: Context, intent: Intent) {
        val identifier = intent.getStringExtra("identifier") ?: return
        val title      = intent.getStringExtra("title") ?: "⏰ Alarm"
        val body       = intent.getStringExtra("body")

        createNotificationChannel(context)

        // ── Activity intent (fullscreen + tap) ────────────────────────────────
        val activityIntent = Intent(context, AlarmActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra("identifier", identifier)
            putExtra("title", title)
            putExtra("body", body)
        }

        val activityPi = PendingIntent.getActivity(
            context,
            identifier.hashCode(),
            activityIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // ── Build notification ────────────────────────────────────────────────
        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setAutoCancel(true)
            // Tap from shade → open AlarmActivity
            .setContentIntent(activityPi)
            // Full-Screen Intent → launch AlarmActivity over lock screen
            .setFullScreenIntent(activityPi, /* highPriority = */ true)
            .setDefaults(NotificationCompat.DEFAULT_VIBRATE or NotificationCompat.DEFAULT_SOUND)
            .build()

        // Ensure the FSI flag is set (some builders strip it)
        notification.flags = notification.flags or Notification.FLAG_INSISTENT

        try {
            val nm = NotificationManagerCompat.from(context)
            nm.notify(NOTIF_ID_OFFSET + identifier.hashCode(), notification)
        } catch (e: SecurityException) {
            // POST_NOTIFICATIONS not granted — silently skip (AlarmActivity still fires via FSI)
        }
    }

    private fun createNotificationChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Full-screen class alarm notifications"
                enableVibration(true)
                setShowBadge(true)
                // Allow Full-Screen Intents on this channel
                setBypassDnd(true)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }
            val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.createNotificationChannel(channel)
        }
    }
}
