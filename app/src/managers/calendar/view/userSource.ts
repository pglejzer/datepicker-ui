import type { NavigateSource } from "@/types/internal";

const USER_SOURCES: readonly NavigateSource[] = [
  "drag",
  "wheel",
  "button",
  "keyboard",
  "menu",
];

export const isUserSource = (source: NavigateSource): boolean =>
  USER_SOURCES.includes(source);
