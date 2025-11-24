import {
  CaretDownIcon,
  CaretRightIcon,
  CheckIcon,
} from "@phosphor-icons/react/dist/ssr";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Icon } from "./icon";
import { cn } from "~/utils/misc";

export const DropdownMenu = DropdownMenuPrimitive.Root;

export function DropdownMenuTrigger({
  children,
  ...props
}: Omit<
  React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>,
  "asChild"
> & { children: React.ReactNode }) {
  return (
    <DropdownMenuPrimitive.Trigger asChild {...props}>
      {children}
    </DropdownMenuPrimitive.Trigger>
  );
}

export const DropdownMenuTriggerIcon = CaretDownIcon;

const itemClassName = cn(
  "relative flex items-center gap-1 rounded-xs px-2 py-1.5 text-sm outline-hidden transition-colors select-none bg-slate-950/80 hover:bg-white/20 active:bg-white/25 data-disabled:pointer-events-none data-disabled:opacity-50"
);

export function DropdownMenuItem({
  className,
  children,
  iconBefore,
  iconAfter,
  ...props
}: Omit<React.ComponentProps<typeof DropdownMenuPrimitive.Item>, "asChild"> & {
  iconBefore?: React.ReactNode;
  iconAfter?: React.ReactNode;
}) {
  return (
    <DropdownMenuPrimitive.Item
      className={cn(itemClassName, className)}
      {...props}
    >
      {iconBefore ? <Icon className="opacity-75">{iconBefore}</Icon> : null}
      {children}
      {iconAfter ? <Icon className="ml-auto">{iconAfter}</Icon> : null}
    </DropdownMenuPrimitive.Item>
  );
}

export function DropdownMenuSubTrigger({
  className,
  children,
  iconBefore,
  iconAfter = <CaretRightIcon />,
  ...props
}: Omit<
  React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger>,
  "asChild"
> & {
  iconBefore?: React.ReactNode;
  iconAfter?: React.ReactNode;
}) {
  return (
    <DropdownMenuPrimitive.SubTrigger
      className={cn("data-[state=open]:bg-subtle", itemClassName, className)}
      {...props}
    >
      {iconBefore ? <Icon>{iconBefore}</Icon> : null}
      {children}
      {iconAfter ? <Icon className="ml-auto">{iconAfter}</Icon> : null}
    </DropdownMenuPrimitive.SubTrigger>
  );
}

const contentClassName = cn(
  "z-50 min-w-[8rem] overflow-hidden rounded-md border border-white/10 bg-slate-950/80 p-1 shadow-md"
);
const contentAnimationClassName = cn(
  "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
);

export function DropdownMenuContent({
  className,
  align = "start",
  sideOffset = 4,
  collisionPadding = 8,
  ...props
}: Omit<
  React.ComponentProps<typeof DropdownMenuPrimitive.Content>,
  "asChild"
>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={cn(contentClassName, contentAnimationClassName, className)}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

export const DropdownMenuSub = DropdownMenuPrimitive.Sub;

export function DropdownMenuSubContent({
  className,
  alignOffset = -5,
  sideOffset = 4,
  collisionPadding = 8,
  ...props
}: Omit<
  React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>,
  "asChild"
>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.SubContent
        alignOffset={alignOffset}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={cn(contentClassName, contentAnimationClassName, className)}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

export const DropdownMenuGroup = DropdownMenuPrimitive.Group;

export const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

export function DropdownMenuCheckboxItem({
  className,
  children,
  iconBefore = <CheckIcon />,
  iconAfter,
  checked,
  ...props
}: Omit<
  React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>,
  "asChild"
> & {
  iconBefore?: React.ReactNode;
  iconAfter?: React.ReactNode;
}) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      className={cn(itemClassName, className)}
      checked={checked}
      {...props}
    >
      <Icon>
        <DropdownMenuPrimitive.ItemIndicator
          className="data-[state=unchecked]:opacity-0"
          forceMount
          asChild
        >
          {iconBefore}
        </DropdownMenuPrimitive.ItemIndicator>
      </Icon>
      {children}
      {iconAfter ? <Icon className="ml-auto">{iconAfter}</Icon> : null}
    </DropdownMenuPrimitive.CheckboxItem>
  );
}

export function DropdownMenuRadioItem({
  className,
  children,
  iconBefore = <CheckIcon />,
  iconAfter,
  ...props
}: Omit<
  React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem>,
  "asChild"
> & {
  iconBefore?: React.ReactNode;
  iconAfter?: React.ReactNode;
}) {
  return (
    <DropdownMenuPrimitive.RadioItem
      className={cn(itemClassName, className)}
      {...props}
    >
      <Icon>
        <DropdownMenuPrimitive.ItemIndicator
          className="data-[state=unchecked]:opacity-0"
          forceMount
          asChild
        >
          {iconBefore}
        </DropdownMenuPrimitive.ItemIndicator>
      </Icon>
      {children}
      {iconAfter ? <Icon className="ml-auto">{iconAfter}</Icon> : null}
    </DropdownMenuPrimitive.RadioItem>
  );
}

export function DropdownMenuLabel({
  className,
  ...props
}: Omit<React.ComponentProps<typeof DropdownMenuPrimitive.Label>, "asChild">) {
  return (
    <DropdownMenuPrimitive.Label
      className={cn("px-2 py-0.5 text-sm font-semibold", className)}
      {...props}
    />
  );
}

export function DropdownMenuSeparator({
  className,
  ...props
}: Omit<
  React.ComponentProps<typeof DropdownMenuPrimitive.Separator>,
  "asChild"
>) {
  return (
    <DropdownMenuPrimitive.Separator
      className={cn("-mx-1 my-1 h-px bg-white/10", className)}
      {...props}
    />
  );
}
