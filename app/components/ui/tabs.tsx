import * as TabsPrimitive from "@radix-ui/react-tabs";
import * as React from "react";
import { cn } from "~/utils/misc";

export const Tabs = TabsPrimitive.Root;

export function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        "inline-flex max-w-full min-w-0 items-center gap-2 rounded-lg bg-screen",
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "focus-visible:focus-ring select-none inline-flex min-w-0 cursor-pointer items-center justify-center gap-2 rounded-md px-2 py-1 text-sm font-bold transition-colors sm:px-3 sm:text-lg",
        "hover:bg-primary-hover/80 active:bg-primary-active/80",
        "data-[state=active]:bg-primary-hover/80 data-[state=active]:text-on-color data-[state=active]:shadow-sm data-[state=active]:hover:bg-primary-hover/80",
        "disabled:pointer-events-none disabled:opacity-40",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn("focus-visible:focus-ring", className)}
      {...props}
    />
  );
}
