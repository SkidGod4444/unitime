package expo.modules.alarmkit

import android.app.Activity
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.view.WindowManager

/**
 * AlarmActivity — a transparent full-screen activity that opens over the
 * lock screen when the alarm fires.
 *
 * It does NOT render any UI itself — it simply:
 * 1. Sets window flags to show over the lock screen and turn the screen on.
 * 2. Forwards a local broadcast so the React Native JS layer receives
 *    the `alarmTriggered` event and navigates to /alarm.player.
 * 3. Finishes itself so the RN app takes focus.
 *
 * The Expo / React Native app handles all UI (alarm.player.tsx).
 */
class AlarmActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // ── Window flags — show over lock screen ──────────────────────────────
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON  or
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
            )
        }

        val identifier = intent.getStringExtra("identifier") ?: ""
        val title      = intent.getStringExtra("title") ?: ""
        val body       = intent.getStringExtra("body") ?: ""

        // ── Bring main RN activity to front ───────────────────────────────────
        val launchIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra("ALARM_KIT_IDENTIFIER", identifier)
            putExtra("ALARM_KIT_TITLE",      title)
            putExtra("ALARM_KIT_BODY",       body)
        }
        if (launchIntent != null) startActivity(launchIntent)

        // Dismiss this transparent trampoline immediately
        finish()
    }
}
