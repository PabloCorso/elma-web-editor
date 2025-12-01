import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import * as React from "react";
import { cn } from "~/utils/misc";

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;

type TooltipTriggerProps = Omit<
  React.ComponentPropsWithRef<typeof TooltipPrimitive.Trigger>,
  "asChild"
>;

export function TooltipTrigger(props: TooltipTriggerProps) {
  return <TooltipPrimitive.Trigger asChild {...props} />;
}

export type TooltipContentProps = Omit<
  React.ComponentProps<typeof TooltipPrimitive.Content>,
  "asChild"
>;

export function TooltipContent({
  children,
  className,
  sideOffset = 4,
  ...props
}: TooltipContentProps) {
  return (
    <TooltipPrimitive.Content
      sideOffset={sideOffset}
      className={cn(
        "z-50 animate-in overflow-hidden rounded-md border border-default bg-screen px-3 py-1.5 text-sm shadow-md fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
        className
      )}
      {...props}
    >
      {children}
    </TooltipPrimitive.Content>
  );
}
