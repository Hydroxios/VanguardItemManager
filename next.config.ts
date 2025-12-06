import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "www.bungie.net",
            },
            {
                protocol: "https",
                hostname: "d2foundry.gg",
            }
        ],
    },
};

export default nextConfig;
