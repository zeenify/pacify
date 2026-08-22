const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);
config.resolver.sourceExts.push("cjs");
config.watchFolders = [path.resolve(__dirname, "../../packages")];
module.exports = config;
