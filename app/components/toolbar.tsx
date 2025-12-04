import * as React from "react";
import * as ToolbarPrimitives from "@radix-ui/react-toolbar";
import { cn } from "~/utils/misc";
import { IconButton, type ButtonProps } from "./button";

type ToolbarProps = Omit<
  React.ComponentPropsWithRef<typeof ToolbarPrimitives.Root>,
  "asChild"
>;

export function Toolbar({ className, ...props }: ToolbarProps) {
  return (
    <ToolbarPrimitives.Root
      className={cn(
        "inline-flex items-center rounded-[8px] border border-default bg-screen/80 p-1.5 gap-1 shadow-sm",
        className
      )}
      {...props}
    />
  );
}

type ToolbarButtonProps = ButtonProps;

export function ToolbarButton({
  children,
  className,
  ...props
}: ToolbarButtonProps) {
  return (
    <ToolbarPrimitives.Button className={cn(className)} asChild>
      <IconButton type="button" iconSize="lg" {...props}>
        {children}
      </IconButton>
    </ToolbarPrimitives.Button>
  );
}

type ToolbarSeparatorProps = Omit<
  React.ComponentPropsWithRef<typeof ToolbarPrimitives.Separator>,
  "asChild"
>;

export function ToolbarSeparator({
  className,
  ...props
}: ToolbarSeparatorProps) {
  return (
    <ToolbarPrimitives.Separator
      className={cn("w-px h-6 bg-separator mx-1", className)}
      {...props}
    />
  );
}

type ToolbarGroupProps = Omit<
  React.ComponentPropsWithRef<typeof ToolbarPrimitives.ToggleGroup>,
  "asChild"
>;

export function ToolbarToggleGroup({ className, ...props }: ToolbarGroupProps) {
  return (
    // @ts-ignore
    <ToolbarPrimitives.ToggleGroup
      rovingFocus={false}
      className={cn("flex items-center gap-1", className)}
      {...props}
    />
  );
}

type ToolbarToggleItemProps = ButtonProps & {
  value: string;
};

export function ToolbarToggleItem({
  children,
  ...props
}: ToolbarToggleItemProps) {
  return (
    <ToolbarPrimitives.ToggleItem asChild {...props}>
      <IconButton type="button" iconSize="lg">
        {children}
      </IconButton>
    </ToolbarPrimitives.ToggleItem>
  );
}
