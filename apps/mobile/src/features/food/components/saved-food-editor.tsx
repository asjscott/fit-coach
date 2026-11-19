import type { Food } from "@fit/shared";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { FormControl, FormControlError, FormControlErrorText } from "@/components/form-control";
import { Heading } from "@/components/heading";
import { Input, InputField } from "@/components/input";
import { LoadingButton } from "@/components/loading-button";
import { Modal, ModalBackdrop, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@/components/modal";
import { Text } from "@/components/text";
import { spacing } from "@/theme";
import { useSavedFoods } from "../hooks/use-saved-foods";
import { EMPTY_FORM, type SavedFoodForm, savedFoodForm, savedFoodInput } from "../saved-food-form";

type Field = keyof SavedFoodForm;

const NUTRIENT_FIELDS: { field: Field; label: string }[] = [
  { field: "kcal", label: "kcal" },
  { field: "proteinG", label: "Protein (g)" },
  { field: "carbsG", label: "Carbs (g)" },
  { field: "fatG", label: "Fat (g)" },
  { field: "fibreG", label: "Fibre (g, optional)" },
];

// A half-width field sits beside another in a grid
type FieldOptions = { numeric?: boolean; half?: boolean; placeholder?: string; accessibilityLabel?: string };

// Create food, from a label, when nothing has the barcode (spec #158 stories 67 and 68), or editing a Saved Food,
// which can also be deleted there (story 70). Logged Food Entries keep their own copy, so neither changes a day.
// Rendered only while open, so each opening starts from the food or an empty label (named as searched)
export function SavedFoodEditor({
  food,
  barcode,
  name,
  onSaved,
  onDeleted,
  onClose,
}: {
  // The Saved Food being edited; none for Create food
  food?: Food;
  // The barcode scanned, which Create food links the new Saved Food to
  barcode?: string;
  // What Create food's name starts as: the words searched for
  name?: string;
  onSaved: (food: Food) => void;
  onDeleted?: () => void;
  onClose: () => void;
}) {
  const savedFoods = useSavedFoods();
  const [form, setForm] = useState<SavedFoodForm>(() =>
    food ? savedFoodForm(food) : { ...EMPTY_FORM, name: name ?? "" },
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"saving" | "deleting" | null>(null);
  const linkedBarcode = food ? food.barcode : barcode;

  const set = (field: Field) => (value: string) => {
    setForm((last) => ({ ...last, [field]: value }));
    setError(null);
  };

  const save = async () => {
    const parsed = savedFoodInput(form, linkedBarcode);
    if ("error" in parsed) {
      setError(parsed.error);
      return;
    }
    setBusy("saving");
    const saved = food ? await savedFoods.update(food.id, parsed.input) : await savedFoods.create(parsed.input);
    setBusy(null);
    if (saved) onSaved(saved);
  };

  const remove = async () => {
    if (!food) return;
    setBusy("deleting");
    const deleted = await savedFoods.remove(food.id);
    setBusy(null);
    if (deleted) onDeleted?.();
  };

  // A field with its name above it, which stays when the field is filled in, as it is when editing
  const labelled = (
    field: Field,
    label: string,
    { numeric = false, half = false, placeholder, accessibilityLabel }: FieldOptions = {},
  ) => (
    <View key={field} style={[styles.field, half && styles.cell]}>
      <Text size="xs" weight="semiBold" color="muted">
        {label}
      </Text>
      <Input>
        <InputField
          value={form[field]}
          onChangeText={set(field)}
          keyboardType={numeric ? "decimal-pad" : "default"}
          placeholder={placeholder}
          accessibilityLabel={accessibilityLabel ?? label}
        />
      </Input>
    </View>
  );

  return (
    <Modal isOpen onClose={() => !busy && onClose()}>
      <ModalBackdrop />
      <ModalContent>
        <ModalHeader>
          <Heading size="md">{food ? "Edit food" : "Create food"}</Heading>
        </ModalHeader>
        <ModalBody keyboardShouldPersistTaps="handled">
          <View style={styles.form}>
            <Text color="muted">
              {food
                ? "Fixing a label changes what you log from now on. Foods you've already logged stay as they were."
                : linkedBarcode
                  ? "Nothing has this barcode yet. Copy the label, and the next scan finds it in your Saved Foods."
                  : "Copy the label. The food is kept in your Saved Foods."}
            </Text>
            {labelled("name", "Name")}
            {labelled("brand", "Brand (optional)")}
            <View style={styles.grid}>
              {labelled("servingLabel", "Serving", { half: true, placeholder: "e.g. 1 bar" })}
              {labelled("servingGrams", "Grams", {
                numeric: true,
                half: true,
                accessibilityLabel: "Serving weight in grams",
              })}
            </View>
            <Text size="sm" weight="semiBold">
              Per serving
            </Text>
            <View style={styles.grid}>
              {NUTRIENT_FIELDS.map(({ field, label }) =>
                labelled(field, label, { numeric: true, half: true, accessibilityLabel: `${label} per serving` }),
              )}
            </View>
            {error ? (
              <FormControl isInvalid>
                <FormControlError>
                  <FormControlErrorText>{error}</FormControlErrorText>
                </FormControlError>
              </FormControl>
            ) : null}
            {food ? (
              <LoadingButton
                label="Delete from Saved Foods"
                size="sm"
                action="negative"
                variant="link"
                icon="trash"
                loading={busy === "deleting"}
                disabled={!!busy}
                onPress={remove}
              />
            ) : null}
          </View>
        </ModalBody>
        <ModalFooter>
          <LoadingButton label="Cancel" size="sm" action="secondary" disabled={!!busy} onPress={onClose} />
          <LoadingButton
            label={food ? "Save" : "Create food"}
            size="sm"
            loading={busy === "saving"}
            disabled={!!busy}
            onPress={save}
          />
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing[3] },
  field: { gap: spacing[1] },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2] },
  cell: { flexGrow: 1, flexBasis: "45%" },
});
