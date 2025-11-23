import { type IconProps as PhosphorIconProps } from "@phosphor-icons/react";
import { type VariantProps, cva } from "class-variance-authority";
import React, { cloneElement } from "react";
import { cn } from "~/utils/misc";

export const iconVariants = cva("shrink-0", {
  variants: {
    size: {
      xs: "h-3 w-3",
      sm: "h-4 w-4",
      md: "h-5 w-5",
      lg: "h-6 w-6",
      xl: "h-7 w-7",
      "2xl": "h-8 w-8",
      "3xl": "h-9 w-9",
      "4xl": "h-10 w-10",
      "5xl": "h-11 w-11",
      "6xl": "h-12 w-12",
      "7xl": "h-13 w-13",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export type IconProps = VariantProps<typeof iconVariants> &
  Omit<PhosphorIconProps, "size" | "color">;

/**
 * Helper to render component icons with the correct size.
 * ```tsx
 *  <Icon size="lg">
 *    <PlusIcon />
 *  </Icon>
 * ```
 */
export function Icon({ size: sizeProp = "md", children, ...props }: IconProps) {
  if (!React.isValidElement(children)) {
    return children;
  }

  const size = children.props.size ?? sizeProp;
  const className = cn(
    iconVariants({ size }),
    props.className,
    children.props.className
  );
  return cloneElement(children, { ...props, ...children.props, className });
}
