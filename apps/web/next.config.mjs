/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },

  // cPanel/Passenger hosting needs a self-contained bundle with its own
  // entry file, which is exactly what Next's standalone output produces.
  // It's opt-in via BUILD_STANDALONE so the Render build path stays
  // byte-for-byte unchanged — the live service must not be affected by
  // packaging work for a second host.
  ...(process.env.BUILD_STANDALONE === "1" ? { output: "standalone" } : {})
};

export default nextConfig;
