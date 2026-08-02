import type { NextConfig } from "next";

const isGithubPagesBuild = process.env.GITHUB_PAGES === "true";
const basePath = "/nclex-flashcards";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  basePath: isGithubPagesBuild ? basePath : undefined,
  assetPrefix: isGithubPagesBuild ? `${basePath}/` : undefined,
};

export default nextConfig;
