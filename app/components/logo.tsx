import { cn } from "~/utils/misc";
import logo from "~/assets/bear-helmet-96.webp";

export function Logo({
  className,
  ...props
}: React.ComponentPropsWithRef<"img">) {
  return (
    <img
      src={logo}
      alt="Bear Level Editor"
      className={cn("h-8 w-8", className)}
      {...props}
    />
  );
}
