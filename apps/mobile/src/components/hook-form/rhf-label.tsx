import { FormControlLabel, FormControlLabelText } from "../form-control";

// Label for a field inside a FormControl; the required asterisk comes from FormControl's isRequired
export function RHFLabel({ label }: { label?: string }) {
  if (!label) return null;
  return (
    <FormControlLabel>
      <FormControlLabelText>{label}</FormControlLabelText>
    </FormControlLabel>
  );
}
