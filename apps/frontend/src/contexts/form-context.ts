import { createContext, useContext } from 'react';
import type { FieldPath, FieldValues } from 'react-hook-form';

// Legacy context, to be deprecated
export const LegacyFormContext = createContext<{ fields: Record<string, unknown>; updateField: (name: string, value: unknown) => void; } | undefined>(undefined);
export const useLegacyForm = () => useContext(LegacyFormContext) as { fields: Record<string, unknown>; updateField: (name: string, value: unknown) => void; };


// New context for react-hook-form integration

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = {
  name: TName;
};

export const FormFieldContext = createContext<FormFieldContextValue>(
  {} as FormFieldContextValue
);

type FormItemContextValue = {
  id: string;
};

export const FormItemContext = createContext<FormItemContextValue>(
  {} as FormItemContextValue
);
