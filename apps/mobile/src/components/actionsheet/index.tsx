import { createContext, use, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  FlatList,
  Modal,
  PanResponder,
  Platform,
  type PanResponderCallbacks,
  type PanResponderInstance,
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

// progress runs 0 (closed) to 1 (open); drag is how far the user has pulled the content down, by the drag indicator
// or by any downward drag on the content
type ActionsheetContextValue = {
  onClose: () => void;
  progress: Animated.Value;
  drag: Animated.Value;
  contentPan: PanResponderInstance;
  indicatorPan: PanResponderInstance;
};

const ActionsheetContext = createContext<ActionsheetContextValue | null>(null);

function useActionsheetContext() {
  const context = use(ActionsheetContext);
  if (!context) throw new Error("Actionsheet parts must be used inside <Actionsheet>");
  return context;
}

// Pulled down this far, or flicked down this fast, the sheet closes; less springs it back
const CLOSE_DRAG = 80;
const CLOSE_VELOCITY = 0.8;

// Longer than the native modal takes to dismiss
const IOS_DISMISS_FALLBACK_MS = 400;

export type ActionsheetProps = {
  isOpen: boolean;
  onClose: () => void;
  // Runs once the sheet has gone. iOS can't open another modal, such as a confirmation, before then
  onClosed?: () => void;
  children?: ReactNode;
};

// Bottom sheet: backdrop fades while the content slides up, and pulling the content down closes it
export function Actionsheet({ isOpen, onClose, onClosed, children }: ActionsheetProps) {
  const styles = useThemedStyles(createActionsheetStyles);
  const progress = useRef(new Animated.Value(0)).current;
  const drag = useRef(new Animated.Value(0)).current;
  // Stay mounted through the close animation
  const [mounted, setMounted] = useState(isOpen);
  // The latest onClosed for the animation's callback, which isn't rerun when it changes
  const latestOnClosed = useRef(onClosed);
  latestOnClosed.current = onClosed;
  const latestOnClose = useRef(onClose);
  latestOnClose.current = onClose;
  // Set when the sheet has gone and onClosed hasn't run yet, so it runs once
  const closedPending = useRef(false);
  const runClosed = () => {
    if (!closedPending.current) return;
    closedPending.current = false;
    latestOnClosed.current?.();
  };

  const { contentPan, indicatorPan } = useMemo(() => {
    const springBack = () => Animated.spring(drag, { toValue: 0, useNativeDriver: true }).start();
    const pull: PanResponderCallbacks = {
      onPanResponderMove: (_, { dy }) => drag.setValue(Math.max(0, dy)),
      onPanResponderRelease: (_, { dy, vy }) => {
        if (dy > CLOSE_DRAG || vy > CLOSE_VELOCITY) latestOnClose.current();
        else springBack();
      },
      onPanResponderTerminate: springBack,
    };
    return {
      // Takes a downward drag from an item too, which a tap leaves alone
      contentPan: PanResponder.create({
        ...pull,
        onMoveShouldSetPanResponderCapture: (_, { dx, dy }) => dy > 6 && Math.abs(dy) > Math.abs(dx),
      }),
      // The drag indicator is for pulling, so it takes the touch straight away and keeps it
      indicatorPan: PanResponder.create({
        ...pull,
        onStartShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
      }),
    };
  }, [drag]);

  useEffect(() => {
    if (isOpen) setMounted(true);
    Animated.timing(progress, {
      toValue: isOpen ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished || isOpen) return;
      setMounted(false);
      drag.setValue(0);
      closedPending.current = true;
      // On iOS the native modal is still dismissing here, so onDismiss runs it, or this in case onDismiss never comes
      if (Platform.OS === "ios") setTimeout(runClosed, IOS_DISMISS_FALLBACK_MS);
      else runClosed();
    });
  }, [isOpen, progress, drag]);

  return (
    <Modal
      visible={mounted}
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
      onDismiss={Platform.OS === "ios" ? runClosed : undefined}
    >
      <ActionsheetContext value={{ onClose, progress, drag, contentPan, indicatorPan }}>
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
  const { progress, drag, contentPan } = useActionsheetContext();
  const insets = useSafeAreaInsets();
  const translateY = Animated.add(progress.interpolate({ inputRange: [0, 1], outputRange: [600, 0] }), drag);

  return (
    <Animated.View
      {...contentPan.panHandlers}
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
  const { indicatorPan } = useActionsheetContext();
  return (
    <View
      {...indicatorPan.panHandlers}
      accessibilityLabel="Drag down to close"
      style={[styles.dragIndicatorWrapper, webNoScroll]}
    >
      {children}
    </View>
  );
}

// On web, a touch drag here would otherwise scroll the page instead of reaching the gesture. Web-only CSS, which
// React Native's style types don't know ("grab" isn't one of its cursors)
const webNoScroll =
  Platform.OS === "web" ? ({ touchAction: "none", cursor: "grab" } as unknown as ViewStyle) : undefined;

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
      style={({ pressed }) => [styles.item, pressed && styles.itemPressed, disabled && styles.itemDisabled, style]}
      {...props}
    />
  );
}

export function ActionsheetItemText(props: TextProps) {
  return <Text size="md" {...props} />;
}

export function ActionsheetIcon({ name, as, size = 20 }: { name?: IconName; as?: IconComponent; size?: number }) {
  return <Icon name={name} as={as} size={size} color="muted" />;
}

export function ActionsheetScrollView(props: ScrollViewProps) {
  return <ScrollView showsVerticalScrollIndicator={false} {...props} />;
}

export function ActionsheetFlatList<T>(props: FlatListProps<T>) {
  return <FlatList showsVerticalScrollIndicator={false} {...props} />;
}

export function ActionsheetSectionHeaderText(props: TextProps) {
  return <Text size="xs" weight="semiBold" color="subtle" style={{ paddingVertical: spacing[2] }} {...props} />;
}
