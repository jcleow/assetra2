import type { NextConfig } from "next";

const GO_PROXY_PREFIX = "/go-api";
const GO_SERVICE_URL = process.env.GO_SERVICE_URL ?? "http://127.0.0.1:8080";
const GO_SERVICE_HEALTH =
  process.env.GO_SERVICE_HEALTH &&
  process.env.GO_SERVICE_HEALTH.trim().length > 0
    ? process.env.GO_SERVICE_HEALTH
    : "/health";

const normalizedHealthPath = GO_SERVICE_HEALTH.startsWith("/")
  ? GO_SERVICE_HEALTH
  : `/${GO_SERVICE_HEALTH}`;

let goServiceDestination: string;

try {
  const parsedUrl = new URL(GO_SERVICE_URL);
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("GO_SERVICE_URL must use http or https");
  }
  const pathname = parsedUrl.pathname.endsWith("/")
    ? parsedUrl.pathname.slice(0, -1)
    : parsedUrl.pathname;
  goServiceDestination = `${parsedUrl.origin}${pathname}`;
} catch (error) {
  throw new Error(
    `Invalid GO_SERVICE_URL provided: ${(error as Error).message}. Update .env or shell environment.`
  );
}

const nextConfig: NextConfig = {
  experimental: {
    ppr: true,
  },
  images: {
    remotePatterns: [
      {
        hostname: "avatar.vercel.sh",
      },
      {
        protocol: "https",
        //https://nextjs.org/docs/messages/next-image-unconfigured-host
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: `${GO_PROXY_PREFIX}/:path*`,
        destination: `${goServiceDestination}/:path*`,
      },
    ];
  },
  env: {
    NEXT_PUBLIC_GO_PROXY_PREFIX: GO_PROXY_PREFIX,
    NEXT_PUBLIC_GO_SERVICE_HEALTH: normalizedHealthPath,
  },
};

export default nextConfig;
