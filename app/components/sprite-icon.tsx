import { cn } from "~/utils/misc";

type SpriteIconProps = React.ComponentPropsWithRef<"span"> & {
  src?: string;
  alt?: string;
};

export function SpriteIcon({
  className,
  style,
  src,
  alt,
  ...props
}: SpriteIconProps) {
  return (
    <span
      className={cn("bg-cover", className)}
      style={{ backgroundImage: src ? `url(${src})` : undefined, ...style }}
      aria-label={alt}
      {...props}
    />
  );
}

export function PictureIcon({ className, ...props }: SpriteIconProps) {
  return (
    <SpriteIcon
      className={cn("bg-contain bg-no-repeat bg-center", className)}
      {...props}
    />
  );
}
