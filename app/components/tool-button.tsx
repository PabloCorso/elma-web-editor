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
  isLoading?: boolean;
};

export function ToolButton({
  name,
  shortcut,
  tooltipSide,
  isLoading,
  children,
  ...props
}: ToolButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger>
        <ToolbarButton
          aria-label={`${name}${shortcut ? ` (${shortcut})` : ""}`}
          isLoading={isLoading}
          {...props}
        >
          {children}
        </ToolbarButton>
      </TooltipTrigger>
      <TooltipContent side={tooltipSide} className="flex items-center gap-2">
        {name}
        {shortcut && <span className="text-secondary">{shortcut}</span>}
      </TooltipContent>
    </Tooltip>
  );
}
