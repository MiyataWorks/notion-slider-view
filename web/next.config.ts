import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      // Notion public images
      {
        protocol: "https",
        hostname: "www.notion.so",
      },
      {
        protocol: "https",
        hostname: "notion.so",
      },
      // Notion image proxy
      {
        protocol: "https",
        hostname: "image.notion.so",
      },
      // Notion file CDN (secure)
      {
        protocol: "https",
        hostname: "prod-files-secure.s3.us-west-2.amazonaws.com",
      },
      // Notion new asset domains (forward-compatible)
      {
        protocol: "https",
        hostname: "s3.us-west-2.amazonaws.com",
      },
      // Legacy dash-separated AWS hostname
      {
        protocol: "https",
        hostname: "s3-us-west-2.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "prod-notion.s3.us-west-2.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "secure.notion-static.com",
      },
    ],
  },
  async headers() {
    // Allow embedding this app inside Notion pages
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              // Allow HTTPS ancestors generally (desktop app wrappers) and Notion-specific hosts
              // Note: We rely on CSP (not XFO) for clickjacking protection in this app.
              "frame-ancestors 'self' https: https://www.notion.so https://notion.so https://*.notion.so https://*.notion.site;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
