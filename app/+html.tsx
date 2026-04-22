import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

/**
 * Custom HTML shell for the Expo Router web build.
 * Injects PWA manifest, Apple-specific meta tags, and theme color.
 * This file is only used during static web export (Expo Router).
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />

        {/* PWA manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* Theme color (Safari toolbar / Android Chrome) */}
        <meta name="theme-color" content="#3730a3" />

        {/* Apple PWA meta tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="絵本メーカーAI" />
        <link rel="apple-touch-icon" href="/icon-192.png" />

        {/* SEO */}
        <title>絵本メーカーAI - 写真をAIで絵本に変換</title>
        <meta
          name="description"
          content="写真をAIで絵本風イラストに変換。KDP出版対応PDFを自動生成。Amazonで自分だけの絵本を出版しよう。"
        />

        {/* Prevent scroll bounce on iOS web */}
        <ScrollViewStyleReset />

        {/* Disable native text size adjustment */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body { height: 100%; overflow: hidden; }
              * { -webkit-tap-highlight-color: transparent; }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
