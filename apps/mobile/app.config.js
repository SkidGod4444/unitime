
const IS_DEV = process.env.APP_VARIANT === 'development';
const IS_PREVIEW = process.env.APP_VARIANT === 'preview';
const LOCAL_IP = 'http://localhost:3001'; // Replace with your actual machine IP if different
const ORIGIN = IS_DEV
  ? LOCAL_IP
  : process.env.ORIGIN;


const getUniqueIdentifier = () => {
  if (IS_DEV) return 'com.saidevdhal.UNiTIME.dev';
  if (IS_PREVIEW) return 'com.saidevdhal.UNiTIME.preview';
  return 'com.saidevdhal.UNiTIME';
};

const getAppName = () => {
  if (IS_DEV) return 'UNiTIME (Dev)';
  if (IS_PREVIEW) return 'UNiTIME (Preview)';
  return 'UNiTIME';
};

const getAppIcon = () => {
  if (IS_DEV) return './assets/icons/logo.png';
  if (IS_PREVIEW) return './assets/icons/logo.png';
  return './assets/icons/logo.png';
};


export default ({ config }) => ({
  ...config,
  name: getAppName(),
  slug: 'unitime',
  version: '1.0.1',
  orientation: 'portrait',
  icon: getAppIcon(),
  scheme: 'unitime',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  deepLinking: true,
  plugins: [
    'expo-localization',
    'expo-quick-actions',
    [
      "expo-secure-store",
      {
        configureAndroidBackup: true,
        faceIDPermission: "Allow $(PRODUCT_NAME) to access your Face ID biometric data."
      }
    ],
    [
      'expo-router', 
      {
        origin: ORIGIN
      }
    ],
    [
      'expo-splash-screen',
      {
        image: getAppIcon(),
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: "#000000",
      },
    ],
    [
      'expo-location',
      {
        isAndroidBackgroundLocationEnabled: true,
        isIosBackgroundLocationEnabled: true,
        locationAlwaysAndWhenInUsePermission: "Allow $(PRODUCT_NAME) to use your location.",
      },
    ],
    [
      'expo-font',
      {
        fonts: [
          './assets/fonts/Lora-Regular.ttf',
          './assets/fonts/Lora-Bold.ttf',
          './assets/fonts/Lora-Italic.ttf',
          './assets/fonts/Lora-BoldItalic.ttf',
          './assets/fonts/Lora-Medium.ttf',
          './assets/fonts/Lora-MediumItalic.ttf',
          './assets/fonts/Lora-SemiBold.ttf',
          './assets/fonts/Lora-SemiBoldItalic.ttf',
        ],
      },
    ],
    [
      'expo-media-library',
      {
        photosPermission: "Allow $(PRODUCT_NAME) to access your photos.",
        savePhotosPermission: "Allow $(PRODUCT_NAME) to save photos.",
        isAccessMediaLocationEnabled: true,
      },
    ],
    [
      "expo-notifications",
      {
        icon: getAppIcon(),
        color: "#ffffff",
      },
    ],
    [
      'expo-camera',
      {
        cameraPermission: "Allow $(PRODUCT_NAME) to access your camera to scan QR codes.",
      },
    ],
    [
      'expo-build-properties',
      {
        android: {
          extraGradleProps: {
            'android.disableAutomaticComponentCreation': 'true',
          },
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  ios: {
    ...config.ios,
    bundleIdentifier: getUniqueIdentifier(),
    supportsTablet: true,
    deploymentTarget: '12.0',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      UIBackgroundModes: ["location"],
      NSLocationWhenInUseUsageDescription: 'Allow this app to use your location.',
      NSLocationAlwaysUsageDescription: 'Allow this app to always access your location.',
      NSLocationAlwaysAndWhenInUseUsageDescription: 'Allow this app to access your location.',
      NSCameraUsageDescription: 'Allow this app to access your camera to scan QR codes.',
    },
    entitlements: {
      'com.apple.developer.networking.wifi-info': true,
    },
    // config: {
    //   googleMapsApiKey: process.env.GOOGLE_API_KEY,
    //   usesNonExemptEncryption: false,
    // },
  },
  android: {
    ...config.android,
    package: getUniqueIdentifier(),
    googleServicesFile: "./google-services.json",
    adaptiveIcon: {
      foregroundImage: './assets/icons/logo.png',
      backgroundColor: '#000000',
    },
    permissions: [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        "FOREGROUND_SERVICE",
        "FOREGROUND_SERVICE_LOCATION",
        "FOREGROUND_SERVICE_NOTIFICATION",
        "FOREGROUND_SERVICE_BACKGROUND_AUDIO",
        "CAMERA",
        "RECORD_AUDIO"
      ],
    // config: {
    //   googleMaps: {
    //     apiKey: process.env.GOOGLE_API_KEY,
    //     },
    //   },
    intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "https",
              host: "*.webapp.io",
              pathPrefix: "/records"
            }
          ],
          category: ["BROWSABLE", "DEFAULT"]
        }
      ]
  },
  web: {
    ...config.web,
    bundler: 'metro',
    output: 'server',
    favicon: './assets/images/favicon.png',
  },
  extra: {
    APP_VARIANT: IS_DEV ? "development" : "preview",
    ORIGIN: ORIGIN,
    router: {
      origin: false,
    },
    eas: {
        projectId: "7c92f536-ed65-4cbb-856a-f32a8f8eacac"
      }
  },
});