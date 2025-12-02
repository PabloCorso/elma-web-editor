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

type ToolButtonProps = React.ComponentPropsWithRef<"button"> & {
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
        <ToolbarButton aria-label={`${name}${shortcut}`} {...props}>
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
  ...props
}: ToolControlButtonProps) {
  const activeTool = useEditorActiveTool();
  const { activateTool } = useEditorActions();
  const isActive = id ? activeTool?.meta.id === id : false;
  return (
    <ToolButton
      className={cn({ "bg-primary-hover/50": isActive }, className)}
      onClick={() => {
        id && activateTool(id);
      }}
      {...props}
    >
      {children}
    </ToolButton>
  );
}
