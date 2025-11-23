import { XIcon } from "@phosphor-icons/react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as React from "react";
import { IconButton, type IconButtonProps } from "./button";
import { cn } from "~/utils/misc";

export type DialogProps = React.ComponentProps<typeof DialogPrimitive.Root>;

export const Dialog = DialogPrimitive.Root;

export type DialogTriggerProps = Omit<
  React.ComponentProps<typeof DialogPrimitive.Trigger>,
  "asChild"
>;

export function DialogTrigger(props: DialogTriggerProps) {
  return <DialogPrimitive.Trigger asChild {...props} />;
}

export const DialogPortal = DialogPrimitive.Portal;

export type DialogCloseProps = Omit<
  React.ComponentProps<typeof DialogPrimitive.Close>,
  "asChild"
>;

export function DialogClose(props: DialogCloseProps) {
  return <DialogPrimitive.Close asChild {...props} />;
}

export function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    /**
     * Replaced DialogOverlay with simple <div /> element.
     * This component implements scroll removal and breaks the scroll positioning.
     * Possible fix waiting for https://github.com/radix-ui/primitives/pull/2250.
     */
    <div
      className={cn(
        "fixed inset-0 z-50 bg-black/80 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
        className
      )}
      {...props}
    />
  );
}

export function DialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cn(
          "fixed top-[50%] left-[50%] z-50 grid max-h-[calc(100dvh-2rem)] w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] overflow-x-hidden overflow-y-auto rounded-lg border border-primary bg-slate-950/80 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 sm:max-w-lg",
          className
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

export function DialogXClose(props: IconButtonProps) {
  const ariaLabel = props["aria-label"] ?? "Close";
  return (
    <DialogPrimitive.Close asChild>
      <IconButton variant="ghost" {...props} aria-label={ariaLabel}>
        <XIcon aria-hidden="true" />
      </IconButton>
    </DialogPrimitive.Close>
  );
}

export function DialogHeader({
  className,
  children,
  closeLabel,
  showCloseButton = false,
  ...props
}: React.ComponentProps<"div"> & {
  closeLabel?: string;
  showCloseButton?: boolean;
}) {
  return (
    <div
      className={cn("flex items-center gap-2 p-3.5 pl-6", className)}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogXClose className="ml-auto self-start" aria-label={closeLabel} />
      )}
    </div>
  );
}

export function DialogBody({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col gap-2 px-6 pb-3", className)}
      {...props}
    />
  );
}

export function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn("text-xl font-bold", className)}
      {...props}
    />
  );
}

export function DialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex justify-end gap-3 p-3", className)} {...props} />
  );
}

/**
 * An optional accessible description to be announced when the dialog is opened.
 * https://www.radix-ui.com/primitives/docs/components/dialog#description
 * For screen readers only use `sr-only` class name
 */
export function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn("text-sm", className)}
      {...props}
    />
  );
}
