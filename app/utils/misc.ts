import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useMounted } from "@mantine/hooks";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function checkModifierKey(
  event: KeyboardEvent | MouseEvent | WheelEvent
) {
  const isMac = window.navigator.platform.toUpperCase().includes("MAC");
  return isMac ? event.metaKey : event.ctrlKey;
}

export function getModifier() {
  const isMac = window.navigator.platform.toUpperCase().includes("MAC");
  return isMac ? "⌘" : "Ctrl";
}

export function useModifier() {
  const mounted = useMounted();
  if (!mounted) return "";
  return getModifier();
}
