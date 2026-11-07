// Stands in for @clerk/expo and its subpaths in `pnpm web:signed-in`: always the signed-in dev user. metro.config.js
// only reaches it in development, so it never ships
const auth = {
  isLoaded: true,
  isSignedIn: true,
  userId: "user_dev",
  sessionId: "session_dev",
  getToken: async () => null,
  signOut: async () => {},
};

module.exports = {
  ClerkProvider: ({ children }) => children,
  useAuth: () => auth,
  useClerk: () => ({ signOut: auth.signOut }),
  useHostedAuth: () => ({ startHostedAuth: async () => {} }),
  tokenCache: {},
};
