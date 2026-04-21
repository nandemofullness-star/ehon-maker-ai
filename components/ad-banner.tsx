/**
 * Platform-specific AdBanner bridge.
 * - Native (Android/iOS): ad-banner.native.tsx — uses react-native-google-mobile-ads
 * - Web: ad-banner.web.tsx — shows a placeholder
 *
 * TypeScript resolves this file; Metro resolves the .native/.web variants at runtime.
 */
export { AdBanner, AD_UNIT_IDS } from "./ad-banner.web";
