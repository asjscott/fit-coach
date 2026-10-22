import { createContext, use, type ReactNode } from "react";
import { Modal as RNModal, Pressable, ScrollView, View, type ScrollViewProps, type StyleProp, type ViewProps, type ViewStyle } from "react-native";
import { spacing, useThemedStyles } from "@/theme";
import { Icon } from "../icons";
import { createModalStyles, modalWidths, type ModalSize } from "./styles";

type ModalContextValue = { onClose: () => void; size: ModalSize };

const ModalContext = createContext<ModalContextValue | null>(null);

function useModalContext() {
  const context = use(ModalContext);
  if (!context) throw new Error("Modal parts must be used inside <Modal>");
  return context;
}

export type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  size?: ModalSize;
  children?: ReactNode;
};

export function Modal({ isOpen, onClose, size = "md", children }: ModalProps) {
  const styles = useThemedStyles(createModalStyles);
  return (
    <RNModal visible={isOpen} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <ModalContext value={{ onClose, size }}>
        <View style={styles.root}>{children}</View>
      </ModalContext>
    </RNModal>
  );
}

export function ModalBackdrop() {
  const styles = useThemedStyles(createModalStyles);
  const { onClose } = useModalContext();
  return <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />;
}

export function ModalContent({ style, ...props }: ViewProps & { style?: StyleProp<ViewStyle> }) {
  const styles = useThemedStyles(createModalStyles);
  const { size } = useModalContext();
  return <View style={[styles.content, { width: modalWidths[size] }, style]} {...props} />;
}

export function ModalHeader({ style, ...props }: ViewProps) {
  const styles = useThemedStyles(createModalStyles);
  return <View style={[styles.header, style]} {...props} />;
}

export function ModalCloseButton({ children }: { children?: ReactNode }) {
  const { onClose } = useModalContext();
  return (
    <Pressable onPress={onClose} hitSlop={spacing[2]} accessibilityRole="button" accessibilityLabel="Close">
      {children ?? <Icon name="x" size={20} />}
    </Pressable>
  );
}

export function ModalBody(props: ScrollViewProps) {
  return <ScrollView bounces={false} showsVerticalScrollIndicator={false} {...props} />;
}

export function ModalFooter({ style, ...props }: ViewProps) {
  const styles = useThemedStyles(createModalStyles);
  return <View style={[styles.footer, style]} {...props} />;
}
