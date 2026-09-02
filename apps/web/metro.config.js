const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);
config.resolver.sourceExts.push("cjs");
config.watchFolders = [path.resolve(__dirname, "../../packages")];

// @pacify/engine is Node-ESM: its source imports its own .ts files with explicit
// ".js" extensions (required for the server's compiled ESM output). Metro's
// resolver doesn't do TypeScript's extension remapping, so retry as .ts/.tsx.
config.resolver.resolveRequest = (context, spec, platform) => {
  try {
    return context.resolveRequest(context, spec, platform);
  } catch (e) {
    if (spec.startsWith(".") && spec.endsWith(".js")) {
      const base = spec.slice(0, -3);
      try {
        return context.resolveRequest(context, base + ".ts", platform);
      } catch {
        return context.resolveRequest(context, base + ".tsx", platform);
      }
    }
    throw e;
  }
};

module.exports = config;
