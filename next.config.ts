import type { NextConfig } from "next";
const nextConfig: NextConfig = { devIndicators: false,outputFileTracingExcludes:{'/*':['./private/**/*','./.env*','./artifacts/**/*']} };
export default nextConfig;
