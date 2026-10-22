import {
  FormControlError,
  FormControlErrorIcon,
  FormControlErrorText,
  FormControlHelper,
  FormControlHelperText,
} from "../form-control";

// Error message when invalid, otherwise the helper text
export function RHFHelperText({ error, helperText }: { error?: string; helperText?: string }) {
  if (error) {
    return (
      <FormControlError>
        <FormControlErrorIcon />
        <FormControlErrorText>{error}</FormControlErrorText>
      </FormControlError>
    );
  }
  if (!helperText) return null;
  return (
    <FormControlHelper>
      <FormControlHelperText>{helperText}</FormControlHelperText>
    </FormControlHelper>
  );
}
