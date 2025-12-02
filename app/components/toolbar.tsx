import { cn } from "~/utils/misc";
import { Icon } from "./ui/icon";

export function Toolbar({
  className,
  children,
  ...props
}: React.ComponentPropsWithRef<"div">) {
  return (
    <div
      className={cn(
        "absolute inline-flex items-center rounded-[8px] border border-default bg-screen/80 p-1.5 gap-1 shadow-sm",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

type ToolbarButtonProps = React.ComponentPropsWithRef<"button">;

export function ToolbarButton({
  className,
  children,
  ...props
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "rounded-[4px] shrink-0 hover:bg-primary-hover/80 active:bg-primary-active/80 inline-flex items-center justify-center w-10 h-10",
        className
      )}
      {...props}
    >
      <Icon size="lg">{children}</Icon>
    </button>
  );
}
