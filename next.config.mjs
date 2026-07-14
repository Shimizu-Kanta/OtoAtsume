/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "img.youtube.com" },
      { protocol: "https", hostname: "i.ytimg.com" }
    ]
  },
  ...(process.env.NEXT_STANDALONE === "true" ? { output: "standalone" } : {})
};

export default nextConfig;
