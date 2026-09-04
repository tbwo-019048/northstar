'use client';

import {
  Controller,
  FormProvider,
  useFormState,
  type Control,
  type ControllerFieldState,
  type ControllerRenderProps,
  type FieldPath,
  type FieldValues,
  type UseFormReturn,
  type UseFormStateReturn,
} from 'react-hook-form';

import { cn } from '@/lib/utils';
import { Field, FieldControl, FieldDescription, FieldError, FieldLabel } from './field';

/**
 * `react-hook-form` bound to this system's `Field` wiring.
 *
 * ```tsx
 * const form = useForm<Values>({ resolver: zodResolver(schema) });
 *
 * <Form {...form}>
 *   <form onSubmit={form.handleSubmit(save)} className="flex flex-col gap-4">
 *     <FormField
 *       control={form.control}
 *       name="key"
 *       label="Flag key"
 *       description="Lowercase and dashes only."
 *       render={({ field }) => <Input {...field} />}
 *     />
 *     <FormError />
 *     <Button type="submit" variant="primary">Save</Button>
 *   </form>
 * </Form>
 * ```
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ## THIS IS THE ONE COMPONENT NOT EXPORTED FROM THE PACKAGE BARREL
 *
 * `import { Form } from '@velobitsio/ui'` does **not** work, and that is
 * deliberate. Use `import { Form } from '@velobitsio/ui/form'`.
 *
 * `react-hook-form` is an **optional** peer dependency. The barrel is a single
 * bundled module, so a re-export here would put a top-level
 * `import 'react-hook-form'` at the top of `dist/index.js` , and then every app
 * that imports a Button from the barrel would fail to resolve a package it has
 * no forms in and never installed. The marketing site is exactly that app.
 *
 * The alternative , bundling `react-hook-form` instead of externalising it ,
 * is worse and quieter: the bundled copy has its own module state, so
 * `useFormContext()` inside our `FormField` would read a different context from
 * the consumer's `useForm()`, and every field would silently register against
 * nothing.
 *
 * `test/registry-parity.test.ts` knows about this exception by name, so it stays
 * a decision rather than becoming an oversight.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * ## Validation is zod's job, and zod is not a dependency here
 *
 * The pairing this system assumes is `zodResolver` from `@hookform/resolvers`,
 * so the schema that validates the request body on the server is the same schema
 * that validates the form. Neither package is imported by this file: a resolver
 * is a function you hand to `useForm`, and nothing in the rendering layer needs
 * to know which library produced the messages. That keeps the door open for a
 * consumer already standing on valibot or yup.
 *
 * ## Why a render prop here, when `Field` refused one
 *
 * `FieldControl` was deliberately built on `Slot` because a render prop cannot
 * cross an RSC boundary , *"Functions cannot be passed directly to Client
 * Components"* , and a plain form should drop into a server-rendered page.
 *
 * That constraint does not exist here. `useForm()` is a hook, so any file using
 * this is already a client component, and the render prop is `Controller`'s
 * native shape. Taking it means the controlled-input case (a `Switch`, a
 * `SegmentedControl`, anything that is not a plain `<input>`) works with no
 * adapter.
 */

/** `FormProvider`, renamed. Spread a `useForm()` return value into it. */
function Form<TValues extends FieldValues>(
  props: UseFormReturn<TValues> & { children: React.ReactNode },
) {
  return <FormProvider {...props} />;
}

export interface FormFieldProps<TValues extends FieldValues, TName extends FieldPath<TValues>> {
  control: UseFormReturn<TValues>['control'];
  name: TName;
  /** Bound to the control with `htmlFor`. */
  label?: React.ReactNode;
  /**
   * The format hint. Kept in `aria-describedby` **alongside** the error rather
   * than replaced by it , losing the hint at the moment validation fails is the
   * bug `Field` exists to prevent.
   */
  description?: React.ReactNode;
  /** The control. Spread `field` onto it , see the note on `ref` below. */
  render: (props: {
    field: ControllerRenderProps<TValues, TName>;
    fieldState: ControllerFieldState;
    formState: UseFormStateReturn<TValues>;
  }) => React.ReactElement;
  className?: string;
}

/**
 * One labelled, described, validated row.
 *
 * ## `label` and `description` are props, not children , and that is the point
 *
 * shadcn's version leaves both to the caller as `<FormLabel>` / `<FormDescription>`
 * inside the render tree. That reads more flexibly and gets the ARIA wrong by
 * omission: `Field` has to know **up front** whether a description will exist,
 * because `aria-describedby` is assembled before children render. Leave the
 * description out while the id is still listed and the control points at an
 * element that does not exist , a dangling reference, which several screen
 * readers resolve by announcing nothing at all, including the error.
 *
 * Passing them as props means the component knows, so the correct wiring is the
 * only reachable outcome. For a row that genuinely needs a custom layout, drop
 * to `Field` + `Controller` directly; this is the common case made safe, not a
 * ceiling.
 *
 * ## Spread `field`, all of it
 *
 * `{...field}` carries `ref`, and `ref` is what react-hook-form uses to focus the
 * first invalid control on a failed submit (`shouldFocusError`, on by default).
 * A custom control that accepts `value`/`onChange` and swallows `ref` still
 * *works* , it validates, it shows its message , and submitting an invalid long
 * form silently stops scrolling to the problem. Nothing warns.
 */
function FormField<TValues extends FieldValues, TName extends FieldPath<TValues>>({
  control,
  name,
  label,
  description,
  render,
  className,
}: FormFieldProps<TValues, TName>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState, formState }) => (
        <Field
          error={fieldState.error?.message ?? null}
          describedBy={Boolean(description)}
          className={className}
        >
          {label && <FieldLabel>{label}</FieldLabel>}
          <FieldControl>{render({ field, fieldState, formState })}</FieldControl>
          {description && <FieldDescription>{description}</FieldDescription>}
          {/* Renders nothing when there is no message, so no conditional here. */}
          <FieldError>{fieldState.error?.message}</FieldError>
        </Field>
      )}
    />
  );
}

export interface FormErrorProps<
  TValues extends FieldValues = FieldValues,
> extends React.ComponentProps<'p'> {
  /**
   * Optional. Omit it inside a `<Form>` and the surrounding context supplies it;
   * pass it to use this component with a bare `useForm()` and no provider.
   */
  control?: Control<TValues>;
  /** Overrides the message. Defaults to `formState.errors.root`. */
  children?: React.ReactNode;
}

/**
 * The submit-level error , "that key already exists", "your session expired" ,
 * as opposed to a field's own.
 *
 * Reads `errors.root`, which is where `setError('root', …)` puts a failure that
 * belongs to the request rather than to an input. A form that only ever renders
 * per-field messages has nowhere to put a 409, and the usual outcome is a
 * `console.error` and a submit button that appears to do nothing.
 *
 * `role="alert"` because it appears in response to the user pressing Submit and
 * should interrupt , the same escalation `FieldError` makes, and the opposite of
 * `Alert`'s polite default.
 *
 * Renders nothing when there is no error, so it can sit unconditionally above the
 * submit button. Placement above rather than below is deliberate: a message under
 * the button is frequently below the fold on a long form, so the user sees the
 * click do nothing.
 *
 * ## `useFormState`, not `useFormContext().formState`
 *
 * They look interchangeable and are not. `formState` is a Proxy that records
 * which fields a component read so react-hook-form knows what to re-render;
 * reaching it through `useFormContext()` reads the subscription belonging to the
 * component that called `useForm()`, so this one is never told the error
 * appeared. `useFormState` registers its own subscription, which is the entire
 * reason the hook exists. The broken version renders correctly on first paint
 * and then never updates , so it passes a casual test and fails in use.
 */
function FormError<TValues extends FieldValues = FieldValues>({
  control,
  className,
  children,
  ...props
}: FormErrorProps<TValues>) {
  const { errors } = useFormState({ control });
  const message = children ?? errors.root?.message;
  if (!message) return null;
  return (
    <p
      role="alert"
      data-slot="form-error"
      className={cn('text-sm font-medium text-danger', className)}
      {...props}
    >
      {message}
    </p>
  );
}

export { Form, FormField, FormError };
