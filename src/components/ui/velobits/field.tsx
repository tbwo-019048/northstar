'use client';

import { createContext, useContext, useId } from 'react';
import { Slot } from 'radix-ui';

import { cn } from '@/lib/utils';
import { Label } from './label';

/**
 * The wiring every form row needs and nobody writes correctly by hand: a label
 * bound to the control, a description and an error both referenced from
 * `aria-describedby`, and `aria-invalid` set when there is an error.
 *
 * The part that is easy to get wrong: when a field has BOTH a description and an
 * error, `aria-describedby` must list both ids, and the error should come first
 * so it is announced first. Dropping the description when an error appears is
 * the common bug , the user loses the format hint at the exact moment they need
 * it.
 *
 * ```tsx
 * <Field error={errors.key?.message}>
 *   <FieldLabel>Flag key</FieldLabel>
 *   <FieldControl>
 *     <Input />
 *   </FieldControl>
 *   <FieldDescription>Lowercase, dashes only.</FieldDescription>
 *   <FieldError>{errors.key?.message}</FieldError>
 * </Field>
 * ```
 */

interface FieldContextValue {
  id: string;
  descriptionId: string;
  errorId: string;
  hasError: boolean;
  hasDescription: boolean;
}

const FieldContext = createContext<FieldContextValue | null>(null);

function useField(component: string): FieldContextValue {
  const ctx = useContext(FieldContext);
  if (!ctx) throw new Error(`<${component}> must be used inside a <Field>.`);
  return ctx;
}

export interface FieldProps extends React.ComponentProps<'div'> {
  /** Overrides the generated id, for when a caller needs a stable one. */
  id?: string;
  /** Presence of a message here is what marks the field invalid. */
  error?: string | null;
  /** Set when a description will be rendered, so ids are wired up front. */
  describedBy?: boolean;
}

function Field({ className, id: idProp, error, describedBy, children, ...props }: FieldProps) {
  const generated = useId();
  const id = idProp ?? generated;

  return (
    <FieldContext.Provider
      value={{
        id,
        descriptionId: `${id}-description`,
        errorId: `${id}-error`,
        hasError: Boolean(error),
        hasDescription: describedBy ?? true,
      }}
    >
      <div
        data-slot="field"
        data-invalid={error ? 'true' : undefined}
        className={cn('group flex flex-col gap-1.5', className)}
        {...props}
      >
        {children}
      </div>
    </FieldContext.Provider>
  );
}

function FieldLabel({ className, ...props }: React.ComponentProps<typeof Label>) {
  const { id } = useField('FieldLabel');
  return <Label htmlFor={id} className={className} {...props} />;
}

export interface FieldControlProps {
  /** The single control element to wire up. */
  children: React.ReactNode;
}

/**
 * Applies the generated `id`, `aria-describedby` and `aria-invalid` onto its
 * single child via Radix's `Slot`.
 *
 * ## Why a Slot and not a render prop
 *
 * The render-prop version of this (`{(props) => <Input {...props} />}`) is
 * unusable from a Server Component: `Field` is a client component, and React
 * refuses to serialise a function child across that boundary with
 * *"Functions cannot be passed directly to Client Components"*. Since half the
 * point of a design system is that a consumer can drop a form into an RSC page,
 * the API has to be plain elements. `Slot` merges the props onto the child
 * instead, and a prop the caller sets explicitly still wins.
 */
function FieldControl({ children }: FieldControlProps) {
  const { id, descriptionId, errorId, hasError, hasDescription } = useField('FieldControl');

  // Error first: a screen reader announces describedby in order, and the
  // failure matters more than the hint. Both are listed , losing the hint when
  // an error appears is the bug this avoids.
  const describedBy =
    [hasError ? errorId : null, hasDescription ? descriptionId : null].filter(Boolean).join(' ') ||
    undefined;

  return (
    <Slot.Root id={id} aria-describedby={describedBy} aria-invalid={hasError || undefined}>
      {children}
    </Slot.Root>
  );
}

function FieldDescription({ className, ...props }: React.ComponentProps<'p'>) {
  const { descriptionId } = useField('FieldDescription');
  return (
    <p
      id={descriptionId}
      data-slot="field-description"
      className={cn('text-xs text-muted-foreground', className)}
      {...props}
    />
  );
}

/**
 * Renders nothing when there is no message, so callers can pass a possibly-
 * undefined validation message without a conditional.
 *
 * `role="alert"` because this appears in response to a user action and should
 * interrupt , unlike `Alert`, which defaults to polite `status`.
 */
function FieldError({ className, children, ...props }: React.ComponentProps<'p'>) {
  const { errorId } = useField('FieldError');
  if (!children) return null;
  return (
    <p
      id={errorId}
      role="alert"
      data-slot="field-error"
      className={cn('text-xs font-medium text-danger', className)}
      {...props}
    >
      {children}
    </p>
  );
}

export { Field, FieldLabel, FieldControl, FieldDescription, FieldError };
