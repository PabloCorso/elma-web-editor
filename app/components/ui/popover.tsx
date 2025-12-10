import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as React from "react";
import { cn } from "~/utils/misc";

export type PopoverProps = React.ComponentProps<typeof PopoverPrimitive.Root>;

export function Popover({ ...props }: PopoverProps) {
  return <PopoverPrimitive.Root {...props} />;
}

export type PopoverTriggerProps = Omit<
  React.ComponentProps<typeof PopoverPrimitive.Trigger>,
  "asChild"
>;

export function PopoverTrigger({ ...props }: PopoverTriggerProps) {
  return <PopoverPrimitive.Trigger asChild {...props} />;
}

export type PopoverContentProps = Omit<
  React.ComponentProps<typeof PopoverPrimitive.Content>,
  "asChild"
>;

export function PopoverContent({
  className,
  align = "center",
  sideOffset = 8,
  ...props
}: PopoverContentProps) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-40 origin-(--radix-popover-content-transform-origin) outline-hidden data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          className
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}

export type PopoverArrowProps = Omit<
  React.ComponentProps<typeof PopoverPrimitive.Arrow>,
  "asChild"
>;

export function PopoverArrow({ className, ...props }: PopoverArrowProps) {
  return (
    <PopoverPrimitive.Arrow
      className={cn(
        "fill-[var(--background-screen)]/80 stroke-[var(--border-default)]",
        className
      )}
      {...props}
    />
  );
}

export type PopoverAnchorProps = Omit<
  React.ComponentProps<typeof PopoverPrimitive.Anchor>,
  "asChild"
>;

export function PopoverAnchor({ ...props }: PopoverAnchorProps) {
  return <PopoverPrimitive.Anchor asChild {...props} />;
}
