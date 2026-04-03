import { ToolbarButton } from "~/components/ui/toolbar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  type TooltipContentProps,
} from "~/components/ui/tooltip";
import type { ButtonProps } from "~/components/ui/button";

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
        className="flex items-center gap-2 text-xs"
      >
        {name}
        {shortcut && <span className="text-secondary">{shortcut}</span>}
      </TooltipContent>
    </Tooltip>
  );
}
