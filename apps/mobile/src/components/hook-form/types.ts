export type Option<T extends string = string> = { value: T; label: string };

export type RHFFieldProps = {
  name: string;
  label?: string;
  helperText?: string;
  required?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
};
