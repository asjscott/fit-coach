import type { AvoidedFood, FoodIdea, FoodIdeaKind } from "@fit/shared";

// The Coach's Food Ideas (spec #158 "Diet and Food Ideas"): everyday high-protein foods, each with a set portion and
// what that portion holds, from USDA FoodData Central's figures for the plain food. Names never start with a proper
// noun, since the Coach's summary lower-cases the second one it names. Jerky and deli turkey count as containing
// gluten, as many are made with soy sauce or wheat fillers

type Row = [
  id: string,
  name: string,
  portion: string,
  grams: number,
  kcal: number,
  proteinG: number,
  carbsG: number,
  fatG: number,
  fibreG: number,
  contains?: AvoidedFood[],
];

const ideas = (kind: FoodIdeaKind, rows: Row[]): FoodIdea[] =>
  rows.map(([id, name, label, grams, kcal, proteinG, carbsG, fatG, fibreG, contains = []]) => ({
    id,
    name,
    portion: { label, grams },
    nutrients: { kcal, proteinG, carbsG, fatG, fibreG },
    kind,
    contains,
  }));

export const FOOD_IDEAS: FoodIdea[] = [
  ...ideas("meat", [
    ["chicken-breast", "Chicken breast", "1 breast, cooked", 150, 248, 46.5, 0, 5.4, 0],
    ["chicken-thigh", "Chicken thigh, skinless", "1 thigh, roasted", 100, 209, 25.9, 0, 10.9, 0],
    ["turkey-breast", "Roast turkey breast", "3 slices", 90, 132, 27, 0, 2.2, 0],
    ["deli-turkey", "Sliced turkey", "4 slices", 56, 58, 10, 2, 1, 0, ["gluten"]],
    ["lean-beef-mince", "Lean beef mince", "1 portion, cooked", 100, 164, 25.7, 0, 6.4, 0],
    ["sirloin-steak", "Sirloin steak", "1 steak, cooked", 150, 280, 45.6, 0, 9.8, 0],
    ["beef-jerky", "Beef jerky", "1 bag", 40, 164, 13.2, 4.4, 10.2, 0.7, ["gluten"]],
    ["pork-tenderloin", "Pork tenderloin", "1 portion, cooked", 120, 172, 31.4, 0, 4.2, 0, ["pork"]],
    ["ham", "Lean ham", "3 slices", 60, 64, 10, 1.5, 2.2, 0, ["pork"]],
  ]),
  ...ideas("fish", [
    ["tuna", "Tuna in water", "1 can, drained", 120, 139, 30.7, 0, 1, 0],
    ["salmon", "Salmon fillet", "1 fillet, cooked", 150, 309, 33, 0, 18.5, 0],
    ["cod", "Cod fillet", "1 fillet, cooked", 150, 158, 34, 0, 1.3, 0],
    ["shrimp", "Shrimp", "1 portion, cooked", 100, 99, 24, 0.2, 0.3, 0],
    ["smoked-salmon", "Smoked salmon", "3 slices", 60, 70, 11, 0, 2.6, 0],
    ["sardines", "Sardines in oil", "1 can, drained", 90, 187, 22, 0, 10.3, 0],
    ["tilapia", "Tilapia fillet", "1 fillet, cooked", 120, 154, 31.5, 0, 3.2, 0],
  ]),
  ...ideas("vegetarian", [
    ["eggs", "Eggs", "2 large", 100, 143, 12.6, 0.7, 9.5, 0],
    ["egg-whites", "Egg whites", "1 cup", 243, 126, 26.5, 1.8, 0.4, 0],
    ["cottage-cheese", "Cottage cheese", "1 cup", 226, 163, 28, 6.1, 2.3, 0, ["dairy"]],
    ["greek-yogurt", "Fat-free Greek yogurt", "1 cup", 200, 118, 20.6, 7.2, 0.8, 0, ["dairy"]],
    ["skyr", "Skyr", "1 pot", 150, 95, 16.5, 6, 0.3, 0, ["dairy"]],
    ["quark", "Quark", "1 pot", 150, 105, 18, 6, 0.5, 0, ["dairy"]],
    ["whey-shake", "Whey protein shake", "1 scoop, in water", 30, 120, 24, 3, 1.5, 0, ["dairy"]],
    ["skim-milk", "Skim milk", "1 glass", 250, 85, 8.5, 12.5, 0.2, 0, ["dairy"]],
    ["string-cheese", "String cheese", "2 sticks", 56, 160, 14, 2, 10.5, 0, ["dairy"]],
    ["ricotta", "Part-skim ricotta", "½ cup", 124, 171, 14, 6.4, 9.8, 0, ["dairy"]],
    ["protein-bar", "Protein bar", "1 bar", 60, 220, 20, 22, 7, 3, ["dairy", "gluten"]],
  ]),
  ...ideas("vegan", [
    ["tofu", "Tofu", "½ block", 150, 216, 26, 4.2, 13, 3.5],
    ["tempeh", "Tempeh", "1 portion", 100, 192, 20.3, 7.6, 10.8, 5],
    ["edamame", "Edamame", "1 cup, shelled", 155, 188, 18.4, 13.8, 8, 8],
    ["lentils", "Lentils", "1 cup, cooked", 198, 230, 17.9, 39.9, 0.8, 15.6],
    ["chickpeas", "Chickpeas", "1 cup, cooked", 164, 269, 14.5, 45, 4.2, 12.5],
    ["black-beans", "Black beans", "1 cup, cooked", 172, 227, 15.2, 40.8, 0.9, 15],
    ["seitan", "Seitan", "1 portion", 100, 120, 25, 4, 2, 1, ["gluten"]],
    ["pea-protein-shake", "Pea protein shake", "1 scoop, in water", 30, 110, 22, 2, 2, 0.5],
    ["soy-milk", "Soy milk", "1 glass", 250, 100, 8, 4, 4.5, 1],
    ["tvp", "Textured soy protein", "¼ cup, dry", 24, 80, 12, 7.2, 0.2, 4],
    ["chickpea-pasta", "Chickpea pasta", "1 portion, dry", 85, 320, 20, 50, 5, 8],
    ["peanut-butter", "Peanut butter", "2 tbsp", 32, 188, 8, 6, 16, 2, ["nuts"]],
    ["almonds", "Almonds", "1 handful", 30, 174, 6.4, 6.5, 15, 3.7, ["nuts"]],
    ["hemp-seeds", "Hemp seeds", "3 tbsp", 30, 166, 9.5, 2.6, 14.6, 1.2],
  ]),
];
