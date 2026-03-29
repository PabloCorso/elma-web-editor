import { cn } from "~/utils/misc";
import logo from "~/assets/bear-helmet.png";

export function Logo({
  className,
  ...props
}: React.ComponentPropsWithRef<"img">) {
  return <img src={logo} className={cn("w-8 h-8", className)} {...props} />;
}
