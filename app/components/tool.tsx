import {
  useEditorActiveTool,
  useEditorActions,
} from "~/editor/use-editor-store";
import { cn } from "~/utils/misc";
import { ToolbarButton } from "./toolbar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  type TooltipContentProps,
} from "./ui/tooltip";
import type { ButtonProps } from "./button";

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

type ToolButtonProps = ButtonProps & {
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

type ToolControlButtonProps = ToolButtonProps & { id?: string };

export function ToolControlButton({
  id,
  className,
  children,
  onClick,
  ...props
}: ToolControlButtonProps) {
  const activeTool = useEditorActiveTool();
  const { activateTool } = useEditorActions();
  const isActive = id ? activeTool?.meta.id === id : false;
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
