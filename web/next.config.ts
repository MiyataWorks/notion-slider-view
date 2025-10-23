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
};

export default nextConfig;
