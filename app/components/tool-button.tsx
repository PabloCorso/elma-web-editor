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
  const label = `${name}${shortcut ? ` (${shortcut})` : ""}`;
  return (
    <Tooltip>
      <TooltipTrigger>
        <ToolbarButton aria-label={name} {...props}>
          <Icon size="lg">{children}</Icon>
        </ToolbarButton>
      </TooltipTrigger>
      <TooltipContent side={tooltipSide} className="text-xs">
        {label}
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
      tooltipSide="right"
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

// export function ToolbarButtonMenu({ children, ...props }: DropdownMenuProps) {
//   return (
//     <DropdownMenu {...props}>
//       <DropdownMenuTrigger>
//         <IconButton size="sm" variant="ghost" className="w-4 rounded-md">
//           <CaretDownIcon className="h-3 w-3" />
//         </IconButton>
//       </DropdownMenuTrigger>
//       <DropdownMenuContent
//         align="start"
//         side="top"
//         className="flex min-w-0 flex-col-reverse border-0"
//       >
//         {children}
//       </DropdownMenuContent>
//     </DropdownMenu>
//   );
// }
