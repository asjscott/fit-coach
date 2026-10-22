import { Children, createContext, use, useState, type ReactNode } from "react";
import { View, type ViewProps } from "react-native";
import { spacing, type SpaceToken } from "@/theme";

type GridContextValue = { columns: number; gap: number; width: number };

const GridContext = createContext<GridContextValue>({ columns: 12, gap: 0, width: 0 });

export type GridProps = ViewProps & {
  columns?: number;
  gap?: SpaceToken;
  children?: ReactNode;
};

// Fixed-column grid; items size themselves from the measured width
export function Grid({ columns = 12, gap = 0, style, children, onLayout, ...props }: GridProps) {
  const [width, setWidth] = useState(0);

  return (
    <View
      style={[{ flexDirection: "row", flexWrap: "wrap", gap: spacing[gap] }, style]}
      onLayout={(e) => {
        setWidth(e.nativeEvent.layout.width);
        onLayout?.(e);
      }}
      {...props}
    >
      <GridContext value={{ columns, gap: spacing[gap], width }}>
        {/* Hide items until measured to avoid a jump on first render */}
        {width > 0 && Children.toArray(children)}
      </GridContext>
    </View>
  );
}

export type GridItemProps = ViewProps & { span?: number };

export function GridItem({ span = 1, style, ...props }: GridItemProps) {
  const { columns, gap, width } = use(GridContext);
  const columnWidth = (width - gap * (columns - 1)) / columns;
  const itemWidth = columnWidth * span + gap * (span - 1);
  return <View style={[{ width: itemWidth }, style]} {...props} />;
}
