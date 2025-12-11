import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function checkModifierKey(
  event: KeyboardEvent | MouseEvent | WheelEvent
) {
  const isMac = navigator.platform.toUpperCase().includes("MAC");
  return isMac ? event.metaKey : event.ctrlKey;
}

export function getModifier() {
  const isMac = navigator.platform.toUpperCase().includes("MAC");
  return isMac ? "⌘" : "Ctrl";
}
