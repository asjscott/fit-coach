import { useEffect, useState } from "react";
import { Text } from "react-native";
import { useApi } from "@/api";
import { errorMessage } from "@/utils/error-message";

// Throws on purpose, so a deploy can be checked end to end from the phone: open /debug-error signed in, and Sentry
// should get one error from the web app and one from the API's GET /debug/error, both under that deploy's
// environment with the Clerk id. The web app's is thrown outside React's render, as an uncaught error is what
// Sentry's global handler catches
export default function DebugError() {
  const api = useApi();
  const [apiResult, setApiResult] = useState("asking the API to throw…");

  useEffect(() => {
    const timer = setTimeout(() => {
      throw new Error("Test error from the web app (/debug-error)");
    });
    api("/debug/error").then(
      () => setApiResult("the API didn't throw"),
      (err: unknown) => setApiResult(`the API answered: ${errorMessage(err)}`),
    );
    return () => clearTimeout(timer);
  }, [api]);

  return <Text>A test error was thrown here, and {apiResult}. Both should show in Sentry in a minute.</Text>;
}
