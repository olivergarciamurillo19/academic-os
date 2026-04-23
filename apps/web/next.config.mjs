import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  transpilePackages: [
    "@academic-os/ai",
    "@academic-os/auth",
    "@academic-os/db",
    "@academic-os/email",
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "*.supabase.in" },
    ],
  },
  webpack: (config) => {
    // Resolve bundler-style '.js' imports inside workspace TS packages
    // (packages/db re-exports './client.js' etc.) to their .ts sources.
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"],
    };
    return config;
  },
};

const sentryConfigured =
  Boolean(process.env.SENTRY_AUTH_TOKEN) && Boolean(process.env.SENTRY_ORG);

export default sentryConfigured
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT ?? "academic-os-web",
      silent: !process.env.CI,
      widenClientFileUpload: true,
      hideSourceMaps: true,
      disableLogger: true,
    })
  : nextConfig;
