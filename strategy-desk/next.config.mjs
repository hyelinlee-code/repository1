import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/**
 * This app lives in a subdirectory of a repository that contains an unrelated
 * project at its root. Pinning the root stops Turbopack from walking up and
 * treating the parent as the workspace.
 *
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  turbopack: { root: projectRoot },
  outputFileTracingRoot: projectRoot,
};

export default nextConfig;
