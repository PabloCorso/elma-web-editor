import {
  useEditorActiveTool,
  useEditorActions,
} from "~/editor/use-editor-store";
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
        "absolute inline-flex items-center rounded-[8px] border border-white/10 bg-slate-950/80 p-1.5 gap-1 shadow-sm",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

type ToolButtonProps = React.ComponentPropsWithRef<"button"> & {
  name?: string;
};

export function ToolButton({
  name,
  className,
  children,
  ...props
}: ToolButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "rounded-[4px] shrink-0 hover:bg-white/20 active:bg-white/25 inline-flex items-center justify-center w-10 h-10",
        className
      )}
      title={name}
      aria-label={name}
      {...props}
    >
      <Icon size="lg">{children}</Icon>
    </button>
  );
}

type ToolActionButtonProps = ToolButtonProps & {
  id?: string;
  name?: string;
  shortcut?: string;
};

export function ToolControlButton({
  id,
  name,
  shortcut,
  className,
  children,
  ...props
}: ToolActionButtonProps) {
  const activeTool = useEditorActiveTool();
  const { activateTool } = useEditorActions();
  return (
    // <Tooltip>
    // <TooltipTrigger>
    <ToolButton
      type="button"
      className={cn({ "bg-white/20": activeTool?.id === id }, className)}
      title={`${name}${shortcut ? ` (${shortcut})` : ""}`}
      aria-label={name}
      onClick={() => {
        id && activateTool(id);
      }}
      {...props}
    >
      {children}
    </ToolButton>
    // </TooltipTrigger>
    // <TooltipContent className="text-xs">{label}</TooltipContent>
    // </Tooltip>
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
