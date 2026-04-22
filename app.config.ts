// Load environment variables with proper priority (system > .env)
import "./scripts/load-env.js";
import type { ExpoConfig } from "expo/config";

// Bundle ID format: space.manus.<project_name_dots>.<timestamp>
// e.g., "my-app" created at 2024-01-15 10:30:45 -> "space.manus.my.app.t20240115103045"
// Bundle ID can only contain letters, numbers, and dots
// Android requires each dot-separated segment to start with a letter
const rawBundleId = "space.manus.kdp.ehon.maker.t20260421094436";
const bundleId =
  rawBundleId
    .replace(/[-_]/g, ".") // Replace hyphens/underscores with dots
    .replace(/[^a-zA-Z0-9.]/g, "") // Remove invalid chars
    .replace(/\.+/g, ".") // Collapse consecutive dots
    .replace(/^\.+|\.+$/g, "") // Trim leading/trailing dots
    .toLowerCase()
    .split(".")
    .map((segment) => {
      // Android requires each segment to start with a letter
      // Prefix with 'x' if segment starts with a digit
      return /^[a-zA-Z]/.test(segment) ? segment : "x" + segment;
    })
    .join(".") || "space.manus.app";
// Extract timestamp from bundle ID and prefix with "manus" for deep link scheme
// e.g., "space.manus.my.app.t20240115103045" -> "manus20240115103045"
const timestamp = bundleId.split(".").pop()?.replace(/^t/, "") ?? "";
const schemeFromBundleId = `manus${timestamp}`;

const env = {
  // App branding - update these values directly (do not use env vars)
  appName: "絵本メーカーAI",
  appSlug: "{{project_name}}",
  // S3 URL of the app logo - set this to the URL returned by generate_image when creating custom logo
  logoUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663583450810/NvVHt8mUcZdui9JqUwg576/icon_new-ByGqkpHxbNxJGVALFfqFgX.png",
  scheme: schemeFromBundleId,
  iosBundleId: bundleId,
  androidPackage: bundleId,
};

const config: ExpoConfig = {
  name: env.appName,
  slug: env.appSlug,
  version: "1.0.0",
  orientation: "portrait",
  icon: "/manus-storage/icon_6b2c3723.png",
  scheme: env.scheme,
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: env.iosBundleId,
    "infoPlist": {
        "ITSAppUsesNonExemptEncryption": false
      }
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#4F46E5",
      foregroundImage: "/manus-storage/android-icon-foreground_935264d5.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: env.androidPackage,
    permissions: ["POST_NOTIFICATIONS"],
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          {
            scheme: env.scheme,
            host: "*",
          },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
    name: "絵本メーカーAI",
    shortName: "絵本メーカーAI",
    description: "写真をAIで絵本風イラストに変換。KDP出版対応フルPDFを自動生成。",
    lang: "ja",
    themeColor: "#3730a3",
    backgroundColor: "#1e1b4b",
  },
  plugins: [
    "expo-router",
    [
      "expo-image-picker",
      {
        photosPermission: "$(PRODUCT_NAME)が写真ライブラリにアクセスして絵本を作成することを許可します。",
        cameraPermission: "$(PRODUCT_NAME)がカメラにアクセスして写真を撮影することを許可します。",
      },
    ],
    [
      "expo-media-library",
      {
        photosPermission: "$(PRODUCT_NAME)が写真ライブラリにアクセスすることを許可します。",
        savePhotosPermission: "$(PRODUCT_NAME)が写真を保存することを許可します。",
        isAccessMediaLocationEnabled: true,
      },
    ],
    [
      "expo-audio",
      {
        microphonePermission: "Allow $(PRODUCT_NAME) to access your microphone.",
      },
    ],
    [
      "expo-video",
      {
        supportsBackgroundPlayback: true,
        supportsPictureInPicture: true,
      },
    ],
    [
      "expo-splash-screen",
      {
        "image": "/manus-storage/splash-icon_366bada5.png",
        "imageWidth": 200,
        "resizeMode": "contain",
        "backgroundColor": "#4F46E5",
        "dark": {
          "backgroundColor": "#312E81"
        }
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          buildArchs: ["armeabi-v7a", "arm64-v8a"],
          minSdkVersion: 24,
        },
      },
    ],
    [
      "react-native-google-mobile-ads",
      {
        androidAppId: "ca-app-pub-6254585875903659~1953233779", // Production App ID (Android)
        iosAppId: "ca-app-pub-6254585875903659~6283361021",     // Production App ID (iOS)
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;
