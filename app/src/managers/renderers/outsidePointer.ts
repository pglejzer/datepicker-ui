export const listenOutsidePointer = (options: {
  inside: readonly HTMLElement[];
  signal: AbortSignal;
  isIgnored(): boolean;
  onOutside(): void;
}): void => {
  document.addEventListener(
    "pointerdown",
    (event) => {
      if (options.isIgnored()) return;
      const path = event.composedPath();
      if (!options.inside.some((element) => path.includes(element))) {
        options.onOutside();
      }
    },
    { capture: true, signal: options.signal },
  );
};
