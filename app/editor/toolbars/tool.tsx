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
import { FloatingViewportToolbar } from "./floating-toolbar";

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
        {shortcut && <span className="text-secondary">{shortcut}</span>}
      </TooltipContent>
    </Tooltip>
  );
}

export type ToolControlButtonProps = ToolButtonProps & {
  id?: string;
  isActive?: boolean;
  isLoading?: boolean;
};

export function ToolControlButton({
  id,
  isActive: isActiveProp,
  className,
  children,
  onClick,
  isLoading,
  ...props
}: ToolControlButtonProps) {
  const activeTool = useEditorActiveTool();
  const { activateTool } = useEditorActions();
  const isActive = isActiveProp ?? (id ? activeTool?.meta.id === id : false);
  return (
    <ToolButton
      className={cn(
        {
          "bg-primary-hover/50": isActive,
          "animate-pulse bg-primary": isLoading,
        },
        className,
      )}
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

export function ToolMenu({
  id,
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<"div"> & {
  id: string;
  children: React.ReactNode;
}) {
  const activeTool = useEditorActiveTool();
  const isActive = activeTool?.meta.id === id;
  if (!isActive) return null;
  return (
    <FloatingViewportToolbar className={className} {...props}>
      {children}
    </FloatingViewportToolbar>
  );
}

type ToolControlMenuProps = {
  id: string;
  button: React.ReactNode;
  children: React.ReactNode;
};

export function ToolControlMenu({
  id,
  button,
  children,
}: ToolControlMenuProps) {
  return (
    <>
      {button}
      <ToolMenu id={id}>{children}</ToolMenu>
    </>
  );
}
