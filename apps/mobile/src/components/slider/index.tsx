import { LinearGradient } from "expo-linear-gradient";
import { createContext, use, useMemo, useRef, useState, type ReactNode } from "react";
import { PanResponder, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { accentGradient, radii, useTheme } from "@/theme";
import { useFormControlContext } from "../form-control";
import { sliderSizes, type SliderSize } from "./styles";

type SliderContextValue = { fraction: number; width: number; size: SliderSize };

const SliderContext = createContext<SliderContextValue | null>(null);

function useSliderContext() {
  const context = use(SliderContext);
  if (!context) throw new Error("Slider parts must be used inside <Slider>");
  return context;
}

export type SliderProps = {
  value?: number;
  defaultValue?: number;
  onChange?: (value: number) => void;
  // Fires once when the finger lifts, e.g. to save
  onChangeEnd?: (value: number) => void;
  minValue?: number;
  maxValue?: number;
  step?: number;
  isDisabled?: boolean;
  size?: SliderSize;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

export function Slider({
  value,
  defaultValue,
  onChange,
  onChangeEnd,
  minValue = 0,
  maxValue = 100,
  step = 1,
  isDisabled,
  size = "md",
  style,
  children,
}: SliderProps) {
  const formControl = useFormControlContext();
  const disabled = isDisabled ?? formControl.isDisabled ?? false;
  const [internal, setInternal] = useState(defaultValue ?? minValue);
  const current = value ?? internal;
  const [width, setWidth] = useState(0);

  // Latest values for the gesture callbacks, which are created once
  const latest = useRef({ left: 0, width: 0, current, minValue, maxValue, step, disabled, onChange, onChangeEnd });
  latest.current = { ...latest.current, current, minValue, maxValue, step, disabled, onChange, onChangeEnd };
  const rootRef = useRef<View>(null);

  const panResponder = useMemo(() => {
    const valueAt = (pageX: number) => {
      const { left, width: w, minValue: min, maxValue: max, step: s } = latest.current;
      const fraction = Math.min(1, Math.max(0, (pageX - left) / (w || 1)));
      return Math.min(max, Math.max(min, min + Math.round((fraction * (max - min)) / s) * s));
    };
    const update = (pageX: number) => {
      const next = valueAt(pageX);
      if (next === latest.current.current) return;
      latest.current.current = next;
      setInternal(next);
      latest.current.onChange?.(next);
    };

    return PanResponder.create({
      onStartShouldSetPanResponder: () => !latest.current.disabled,
      onMoveShouldSetPanResponder: () => !latest.current.disabled,
      // Keep the gesture when a parent ScrollView wants it
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => update(e.nativeEvent.pageX),
      onPanResponderMove: (e) => update(e.nativeEvent.pageX),
      onPanResponderRelease: () => latest.current.onChangeEnd?.(latest.current.current),
    });
  }, []);

  const fraction = maxValue === minValue ? 0 : (current - minValue) / (maxValue - minValue);
  const thumb = sliderSizes[size].thumb;

  return (
    <SliderContext value={{ fraction, width, size }}>
      <View
        ref={rootRef}
        accessibilityRole="adjustable"
        accessibilityValue={{ min: minValue, max: maxValue, now: current }}
        onLayout={(e) => {
          setWidth(e.nativeEvent.layout.width);
          rootRef.current?.measureInWindow((x, _y, w) => {
            latest.current.left = x;
            latest.current.width = w;
          });
        }}
        style={[{ height: thumb, justifyContent: "center" }, disabled && { opacity: 0.4 }, style]}
        {...panResponder.panHandlers}
      >
        {children}
      </View>
    </SliderContext>
  );
}

export function SliderTrack({ children }: { children?: ReactNode }) {
  const { colors } = useTheme();
  const { size } = useSliderContext();
  return (
    <View
      style={{
        height: sliderSizes[size].track,
        borderRadius: radii.pill,
        backgroundColor: colors.border,
        overflow: "hidden",
      }}
    >
      {children}
    </View>
  );
}

export function SliderFilledTrack() {
  const { colors } = useTheme();
  const { fraction } = useSliderContext();
  return (
    <LinearGradient
      colors={accentGradient(colors)}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[StyleSheet.absoluteFill, { width: `${fraction * 100}%` }]}
    />
  );
}

export function SliderThumb() {
  const { colors } = useTheme();
  const { fraction, width, size } = useSliderContext();
  const thumb = sliderSizes[size].thumb;
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: fraction * width - thumb / 2,
        width: thumb,
        height: thumb,
        borderRadius: thumb / 2,
        backgroundColor: colors.onAccent,
        borderWidth: 3,
        borderColor: colors.orange,
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
      }}
    />
  );
}
