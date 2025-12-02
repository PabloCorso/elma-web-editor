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
import { Icon } from "./ui/icon";

type ToolButtonProps = React.ComponentPropsWithRef<"button"> & {
  name?: string;
  shortcut?: string;
  tooltipSide?: TooltipContentProps["side"];
};

export function ToolButton({
  name,
  shortcut,
  tooltipSide,
  className,
  children,
  ...props
}: ToolButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger>
        <ToolbarButton aria-label={`${name}${shortcut}`} {...props}>
          <Icon size="lg">{children}</Icon>
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
  ...props
}: ToolControlButtonProps) {
  const activeTool = useEditorActiveTool();
  const { activateTool } = useEditorActions();
  return (
    <ToolButton
      className={cn(
        { "bg-primary-hover/80": activeTool?.meta.id === id },
        className
      )}
      onClick={() => {
        id && activateTool(id);
      }}
      {...props}
    >
      {children}
    </ToolButton>
  );
}
