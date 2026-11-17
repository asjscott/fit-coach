// PROTOTYPE (M7), throwaway: three Food tab variants, flipped with ?variant= or the floating bar
import { View } from "react-native";
import { FoodVariant } from "@/features/nutrition-prototype/food-variants";
import { PrototypeSwitcher } from "@/features/nutrition-prototype/prototype-switcher";

export default function FoodPrototype() {
  return (
    <View style={{ flex: 1 }}>
      <FoodVariant />
      <PrototypeSwitcher />
    </View>
  );
}
