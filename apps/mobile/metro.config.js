// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// expo-sqlite on web runs SQLite as wasm in a worker
config.resolver.assetExts.push("wasm");

// ...and needs SharedArrayBuffer, which browsers only allow with these headers.
// Dev server only: a production web host must send them too (see README.md)
config.server.enhanceMiddleware = (middleware) => (req, res, next) => {
  res.setHeader("Cross-Origin-Embedder-Policy", "credentialless");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  middleware(req, res, next);
};

module.exports = config;
