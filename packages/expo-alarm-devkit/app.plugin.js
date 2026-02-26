// expo-alarm-kit — Expo Config Plugin
// Adds all required permissions and AndroidManifest entries automatically.

const { withAndroidManifest, withInfoPlist } = require("@expo/config-plugins");

/**
 * @param {import('@expo/config-plugins').ExpoConfig} config
 */
function withExpoAlarmKit(config) {
  config = withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults;
    const app = manifest.manifest.application?.[0];
    if (!app) return mod;

    // ── Permissions ──────────────────────────────────────────────────────────
    const permsNeeded = [
      "android.permission.SCHEDULE_EXACT_ALARM",
      "android.permission.USE_EXACT_ALARM",
      "android.permission.VIBRATE",
      "android.permission.RECEIVE_BOOT_COMPLETED",
      "android.permission.FOREGROUND_SERVICE",
      "android.permission.WAKE_LOCK",
      "android.permission.USE_FULL_SCREEN_INTENT",
      "android.permission.POST_NOTIFICATIONS",
    ];

    manifest.manifest["uses-permission"] =
      manifest.manifest["uses-permission"] ?? [];

    for (const perm of permsNeeded) {
      const already = manifest.manifest["uses-permission"].some(
        (p) => p.$?.["android:name"] === perm
      );
      if (!already) {
        manifest.manifest["uses-permission"].push({
          $: { "android:name": perm },
        });
      }
    }

    // ── Receivers & Services ─────────────────────────────────────────────────
    app.receiver = app.receiver ?? [];
    app.service = app.service ?? [];
    app.activity = app.activity ?? [];

    const receivers = [
      {
        $: {
          "android:name": "expo.modules.alarmkit.AlarmReceiver",
          "android:enabled": "true",
          "android:exported": "true",
        },
      },
      {
        $: {
          "android:name": "expo.modules.alarmkit.BootReceiver",
          "android:enabled": "true",
          "android:exported": "true",
        },
        "intent-filter": [
          {
            action: [{ $: { "android:name": "android.intent.action.BOOT_COMPLETED" } }],
          },
        ],
      },
    ];

    for (const receiver of receivers) {
      const name = receiver.$["android:name"];
      const exists = app.receiver.some((r) => r.$?.["android:name"] === name);
      if (!exists) app.receiver.push(receiver);
    }

    // AlarmActivity — full-screen transparent activity over lock screen
    const activityName = "expo.modules.alarmkit.AlarmActivity";
    const activityExists = app.activity.some(
      (a) => a.$?.["android:name"] === activityName
    );
    if (!activityExists) {
      app.activity.push({
        $: {
          "android:name": activityName,
          "android:theme": "@android:style/Theme.Translucent.NoTitleBar.Fullscreen",
          "android:showWhenLocked": "true",
          "android:turnScreenOn": "true",
          "android:exported": "false",
        },
      });
    }

    return mod;
  });

  // iOS — add NSUserNotificationUsageDescription if not present
  config = withInfoPlist(config, (mod) => {
    if (!mod.modResults.NSUserNotificationUsageDescription) {
      mod.modResults.NSUserNotificationUsageDescription =
        "$(PRODUCT_NAME) uses notifications to deliver class alarms.";
    }
    return mod;
  });

  return config;
}

module.exports = withExpoAlarmKit;
