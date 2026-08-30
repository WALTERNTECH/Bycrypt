/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },

  // cPanel/Passenger hosting needs a self-contained bundle with its own
  // entry file, which is exactly what Next's standalone output produces.
  // Opt-in via BUILD_STANDALONE so the Render build path stays unchanged.
  ...(process.env.BUILD_STANDALONE === "1" ? { output: "standalone" } : {})
};

export default nextConfig;
