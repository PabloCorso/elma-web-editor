import {
  useEditorActiveTool,
  useEditorActions,
} from "~/editor/use-editor-store";
import { cn } from "~/utils/misc";
import { ToolbarButton } from "~/components/ui/toolbar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  type TooltipContentProps,
} from "~/components/ui/tooltip";
import type { ButtonProps } from "~/components/ui/button";
import { Portal, type PortalProps } from "@radix-ui/react-portal";

export function Tool({
  className,
  children,
  ...props
}: React.ComponentPropsWithRef<"div">) {
  return (
    <div className={cn("flex gap-px items-center", className)} {...props}>
      {children}
    </div>
  );
}

export type ToolButtonProps = ButtonProps & {
  name?: string;
  shortcut?: string;
  tooltipSide?: TooltipContentProps["side"];
};

export function ToolButton({
  name,
  shortcut,
  tooltipSide,
  children,
  ...props
}: ToolButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger>
        <ToolbarButton
          aria-label={`${name}${shortcut ? ` (${shortcut})` : ""}`}
          {...props}
        >
          {children}
        </ToolbarButton>
      </TooltipTrigger>
      <TooltipContent
        side={tooltipSide}
        className="text-xs flex items-center gap-2"
      >
        {name}
        {shortcut && <span className="text-slate-400">{shortcut}</span>}
      </TooltipContent>
    </Tooltip>
  );
}

export type ToolControlButtonProps = ToolButtonProps & {
  id?: string;
  isActive?: boolean;
};

export function ToolControlButton({
  id,
  isActive: isActiveProp,
  className,
  children,
  onClick,
  ...props
}: ToolControlButtonProps) {
  const activeTool = useEditorActiveTool();
  const { activateTool } = useEditorActions();
  const isActive = isActiveProp ?? (id ? activeTool?.meta.id === id : false);
  return (
    <ToolButton
      className={cn({ "bg-primary-hover/50": isActive }, className)}
      onClick={(event) => {
        if (id) activateTool(id);
        onClick?.(event);
      }}
      {...props}
    >
      {children}
    </ToolButton>
  );
}

export function ToolMenuPortal({ className, ...props }: PortalProps) {
  return (
    <Portal
      className={cn(
        "h-fit fixed max-h-[80vh] left-20 shadow-lg inset-y-4 my-auto overflow-y-auto",
        className,
      )}
      {...props}
    />
  );
}
