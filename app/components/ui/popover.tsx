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
        className={cn("z-40 ", className)}
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
