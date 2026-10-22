import type { ReactNode } from "react";
import { FormProvider as RHFFormProvider, type FieldValues, type UseFormReturn } from "react-hook-form";

type FormProviderProps<T extends FieldValues> = {
  children: ReactNode;
  // Result of useForm(); fields below read it through useFormContext
  form: UseFormReturn<T>;
};

export function FormProvider<T extends FieldValues>({ children, form }: FormProviderProps<T>) {
  return <RHFFormProvider {...form}>{children}</RHFFormProvider>;
}
