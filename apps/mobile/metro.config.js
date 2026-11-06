const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// `pnpm web:signed-in` shows the signed-in app with no Clerk account or .env
if (process.env.CLERK_STUB === "1") {
  if (process.env.NODE_ENV === "production") throw new Error("CLERK_STUB is for development only");
  const stub = path.join(__dirname, "scripts/clerk-stub.js");
  const resolve = config.resolver.resolveRequest;
  config.resolver.resolveRequest = (context, name, platform) => {
    if (name === "@clerk/expo" || name.startsWith("@clerk/expo/")) return { type: "sourceFile", filePath: stub };
    return (resolve ?? context.resolveRequest)(context, name, platform);
  };
}

module.exports = config;
