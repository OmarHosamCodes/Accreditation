import { useCallback, useMemo, useState } from "react";
import { fieldState, type FieldState } from "./validators";

type ValidatorMap<T extends Record<string, string>> = {
  [K in keyof T]: (value: string) => string | null;
};

export function useValidatedFields<T extends Record<string, string>>(
  initial: T,
  validators: ValidatorMap<T>,
) {
  const [values, setValues] = useState<T>(initial);
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const errors = useMemo(() => {
    const next = {} as Record<keyof T, string | null>;
    for (const key of Object.keys(validators) as (keyof T)[]) {
      next[key] = validators[key](values[key] ?? "");
    }
    return next;
  }, [values, validators]);

  const states = useMemo(() => {
    const next = {} as Record<keyof T, FieldState>;
    for (const key of Object.keys(validators) as (keyof T)[]) {
      const value = values[key] ?? "";
      const isTouched = Boolean(touched[key]) || submitAttempted;
      next[key] = fieldState(value, isTouched, errors[key]);
    }
    return next;
  }, [values, touched, errors, validators, submitAttempted]);

  const readiness = useMemo(() => {
    const keys = Object.keys(validators) as (keyof T)[];
    const met = keys.filter((key) => errors[key] === null && (values[key] ?? "").length > 0).length;
    return { met, total: keys.length, ratio: keys.length ? met / keys.length : 0 };
  }, [values, errors, validators]);

  const isValid = useMemo(
    () => (Object.keys(validators) as (keyof T)[]).every((key) => errors[key] === null),
    [errors, validators],
  );

  const setValue = useCallback(<K extends keyof T>(key: K, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const touch = useCallback(<K extends keyof T>(key: K) => {
    setTouched((prev) => ({ ...prev, [key]: true }));
  }, []);

  const touchAll = useCallback(() => {
    setSubmitAttempted(true);
    const all = {} as Record<keyof T, boolean>;
    for (const key of Object.keys(validators) as (keyof T)[]) {
      all[key] = true;
    }
    setTouched(all);
  }, [validators]);

  const visibleErrors = useMemo(() => {
    return (Object.keys(validators) as (keyof T)[])
      .filter((key) => {
        const show = Boolean(touched[key]) || submitAttempted;
        return show && errors[key];
      })
      .map((key) => errors[key] as string);
  }, [errors, touched, validators, submitAttempted]);

  return {
    values,
    errors,
    states,
    readiness,
    isValid,
    visibleErrors,
    setValue,
    touch,
    touchAll,
    submitAttempted,
  };
}
