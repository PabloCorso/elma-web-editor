import {
  useEditorActiveTool,
  useEditorActions,
} from "~/editor/use-editor-store";
import { cn } from "~/utils/misc";
import { FloatingViewportToolbar } from "./floating-toolbar";
import {
  ToolButton as SharedToolButton,
  type ToolButtonProps,
} from "~/components/tool-button";

export { type ToolButtonProps } from "~/components/tool-button";

export function ToolButton(props: ToolButtonProps) {
  return <SharedToolButton {...props} />;
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
    <SharedToolButton
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
    </SharedToolButton>
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
