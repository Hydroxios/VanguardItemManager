import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // The root layout reads the changelog files; ship them with any page rendered on the server at request time
    outputFileTracingIncludes: {
        "/*": ["./CHANGELOG*.md"],
    },
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
