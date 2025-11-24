import { cn } from "~/utils/misc";

export function SpriteIcon({
  className,
  src,
  alt,
  ...props
}: React.ComponentPropsWithRef<"span"> & { src: string; alt?: string }) {
  return (
    <span
      className={cn("bg-cover", className)}
      style={{ backgroundImage: `url(${src})` }}
      aria-label={alt}
      {...props}
    />
  );
}
