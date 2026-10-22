import { createContext, use, useEffect, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  View,
  type FlatListProps,
  type PressableProps,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { spacing, useThemedStyles } from "@/theme";
import { Icon, type IconComponent, type IconName } from "../icons";
import { Text, type TextProps } from "../text";
import { createActionsheetStyles } from "./styles";

type ActionsheetContextValue = { onClose: () => void; progress: Animated.Value };

const ActionsheetContext = createContext<ActionsheetContextValue | null>(null);

function useActionsheetContext() {
  const context = use(ActionsheetContext);
  if (!context) throw new Error("Actionsheet parts must be used inside <Actionsheet>");
  return context;
}

export type ActionsheetProps = {
  isOpen: boolean;
  onClose: () => void;
  children?: ReactNode;
};

// Bottom sheet: backdrop fades while the content slides up
export function Actionsheet({ isOpen, onClose, children }: ActionsheetProps) {
  const styles = useThemedStyles(createActionsheetStyles);
  const progress = useRef(new Animated.Value(0)).current;
  // Stay mounted through the close animation
  const [mounted, setMounted] = useState(isOpen);

  useEffect(() => {
    if (isOpen) setMounted(true);
    Animated.timing(progress, {
      toValue: isOpen ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !isOpen) setMounted(false);
    });
  }, [isOpen, progress]);

  return (
    <Modal visible={mounted} transparent statusBarTranslucent onRequestClose={onClose}>
      <ActionsheetContext value={{ onClose, progress }}>
        <View style={styles.root}>{children}</View>
      </ActionsheetContext>
    </Modal>
  );
}

export function ActionsheetBackdrop() {
  const styles = useThemedStyles(createActionsheetStyles);
  const { onClose, progress } = useActionsheetContext();
  return (
    <Animated.View style={[styles.backdrop, { opacity: progress }]}>
      <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close" />
    </Animated.View>
  );
}

export function ActionsheetContent({ style, children }: { style?: StyleProp<ViewStyle>; children?: ReactNode }) {
  const styles = useThemedStyles(createActionsheetStyles);
  const { progress } = useActionsheetContext();
  const insets = useSafeAreaInsets();
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [600, 0] });

  return (
    <Animated.View
      style={[
        styles.content,
        { paddingBottom: Math.max(insets.bottom, spacing[4]), transform: [{ translateY }] },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

export function ActionsheetDragIndicatorWrapper({ children }: { children?: ReactNode }) {
  const styles = useThemedStyles(createActionsheetStyles);
  return <View style={styles.dragIndicatorWrapper}>{children}</View>;
}

export function ActionsheetDragIndicator() {
  const styles = useThemedStyles(createActionsheetStyles);
  return <View style={styles.dragIndicator} />;
}

export function ActionsheetItem({ style, disabled, ...props }: PressableProps & { style?: StyleProp<ViewStyle> }) {
  const styles = useThemedStyles(createActionsheetStyles);
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        styles.item,
        pressed && styles.itemPressed,
        disabled && styles.itemDisabled,
        style,
      ]}
      {...props}
    />
  );
}

export function ActionsheetItemText(props: TextProps) {
  return <Text size="md" {...props} />;
}

export function ActionsheetIcon({ name, as, size = 20 }: { name?: IconName; as?: IconComponent; size?: number }) {
  return <Icon name={name} as={as} size={size} color="textMuted" />;
}

export function ActionsheetScrollView(props: ScrollViewProps) {
  return <ScrollView showsVerticalScrollIndicator={false} {...props} />;
}

export function ActionsheetFlatList<T>(props: FlatListProps<T>) {
  return <FlatList showsVerticalScrollIndicator={false} {...props} />;
}

export function ActionsheetSectionHeaderText(props: TextProps) {
  return <Text size="xs" weight="semiBold" color="textSubtle" style={{ paddingVertical: spacing[2] }} {...props} />;
}
