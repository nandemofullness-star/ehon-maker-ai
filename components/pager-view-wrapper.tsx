/**
 * Shared type-only re-export so TypeScript resolves the import.
 * The actual implementation is chosen at bundle time:
 *   - pager-view-wrapper.native.tsx  → Android / iOS
 *   - pager-view-wrapper.web.tsx     → Web
 */
export { PagerViewWrapper } from "./pager-view-wrapper.web";
export type { PagerViewWrapperProps } from "./pager-view-wrapper.web";
