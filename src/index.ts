import {
  createEvent,
  createStore,
  Store,
  Event,
  sample,
  Effect,
} from 'effector';

type ValueEntry<Values extends Record<string, any>> = {
  [K in keyof Values]: [K, Values[K]];
}[keyof Values];

export type Touched<Values> = Partial<Record<keyof Values, boolean>>;

export type Field<Value, Error> = {
  initialValue: Value;
  $value: Store<Value>;
  $error: Store<Error | null>;
  $isTouched: Store<boolean | null>;
  reset: Event<void>;
  inputed: Event<Value>;
  changed: Event<Value>;
  touched: Event<void>;
};

export type FieldEntry<
  Values extends Record<string, any>,
  Errors extends Partial<Record<keyof Values, unknown>>
> = {
  [K in keyof Values]: [K, Field<Values[K], Errors[K]>];
}[keyof Values];

type Fields<
  Values extends Record<string, any>,
  Errors extends Record<keyof Values, unknown>
> = {
  [K in keyof Values]: Field<Values[K], Errors[K]>;
};

export type FormOptions<
  Values extends Record<string, any>,
  Errors extends Record<keyof Values, unknown>
> = {
  initialValues: Values;
  validateFx: Effect<Values, Partial<Errors>>;
  submitFx: Effect<Values, any>;
};

export type Form<
  Values extends Record<string, any>,
  Errors extends Record<keyof Values, unknown>
> = {
  initialValues: Values;
  $values: Store<Values>;
  $errors: Store<Partial<Errors>>;
  $isTouched: Store<Touched<Values>>;
  $isValid: Store<boolean>;
  fieldEntries: FieldEntry<Values, Errors>[];
  fields: Fields<Values, Errors>;
  reset: Event<void>;
  submit: Event<void>;
};

export const createForm = <
  Values extends Record<string, any>,
  Errors extends Record<keyof Values, unknown>
>({
  initialValues,
  validateFx,
  submitFx,
}: FormOptions<Values, Errors>): Form<Values, Errors> => {
  const reset = createEvent();
  const inited = createEvent();
  const submit = createEvent<void>();
  const changed = createEvent<ValueEntry<Values>>();
  const inputed = createEvent<ValueEntry<Values>>();
  const touched = createEvent<keyof Values>();

  const $values = createStore<Values>(initialValues)
    .on(changed, (values, [name, value]) => ({
      ...values,
      [name]: value,
    }))
    .on(inputed, (values, [name, value]) => ({
      ...values,
      [name]: value,
    }))
    .reset(reset);

  const $errors = createStore<Partial<Errors>>({}).on(
    validateFx.doneData,
    (_, errors) => errors
  );

  const $isTouched = createStore<Touched<Values>>({})
    .on(touched, (isTouched, name) => ({
      ...isTouched,
      [name]: true,
    }))
    .on(changed, (isTouched, [name]) => ({
      ...isTouched,
      [name]: false,
    }))
    .on(inputed, (isTouched, [name]) => ({
      ...isTouched,
      [name]: false,
    }))
    .reset(reset);

  const $isValid = $errors.map((errors) =>
    Object.values(errors).every((error) => !error)
  );

  const fieldEntries: FieldEntry<Values, Errors>[] = Object.entries(
    initialValues
  ).map(([name, initialValue]: ValueEntry<Values>) => {
    const fieldReset = inputed.prepend(
      (): ValueEntry<Values> => [name, initialValue]
    );

    const fieldInputed = inputed.prepend((value: Values[keyof Values]) => [
      name,
      value,
    ]);

    const fieldChanged = changed.prepend((value: Values[keyof Values]) => [
      name,
      value,
    ]);

    const fieldTouched = touched.prepend(() => name);

    const $isFieldTouched = $isTouched.map<boolean | null>(
      (isTouched) => isTouched[name] ?? null
    );

    const $error = $errors.map<Errors[keyof Values] | null>(
      (errors) => errors[name] ?? null
    );

    const $value = $values.map<Values[keyof Values]>((values) => values[name]);

    const field: Field<Values[keyof Values], Errors[keyof Values]> = {
      initialValue,
      $value,
      $error,
      $isTouched: $isFieldTouched,
      reset: fieldReset,
      inputed: fieldInputed,
      changed: fieldChanged,
      touched: fieldTouched,
    };

    return [name, field] as FieldEntry<Values, Errors>;
  });

  const fields: Fields<Values, Errors> = Object.fromEntries(
    fieldEntries
  ) as any;

  sample({
    clock: $values,
    target: validateFx,
  });

  sample({
    clock: [inited, reset],
    source: $values,
    target: validateFx,
  });

  sample({
    clock: submit,
    source: $values,
    filter: $isValid,
    target: submitFx,
  });

  inited();

  return {
    initialValues,
    $values,
    $errors,
    $isTouched,
    $isValid,
    fieldEntries,
    fields,
    reset,
    submit,
  };
};
