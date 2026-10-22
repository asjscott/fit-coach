import { StyleSheet, View, type ViewProps } from "react-native";

export function Center({ style, ...props }: ViewProps) {
  return <View style={[styles.center, style]} {...props} />;
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
});
