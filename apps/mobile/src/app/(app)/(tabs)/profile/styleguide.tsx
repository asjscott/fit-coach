import { Redirect } from "expo-router";
import ComponentsView from "@/features/components/views/components-view";

// Development builds only, like the Profile button that opens it
export default function StyleguideScreen() {
  if (!__DEV__) return <Redirect href="/profile" />;
  return <ComponentsView />;
}
