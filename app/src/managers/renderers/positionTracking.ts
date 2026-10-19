export const trackPosition = (
  root: HTMLElement,
  anchor: HTMLElement,
  onUpdate: () => void,
): (() => void) => {
  const controller = new AbortController();
  const { signal } = controller;
  let frame = 0;

  const schedule = (): void => {
    if (frame !== 0) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (!signal.aborted) onUpdate();
    });
  };

  window.addEventListener("resize", schedule, { signal });
  window.addEventListener(
    "scroll",
    (event) => {
      const { target } = event;
      if (target instanceof Node && root.contains(target)) return;
      schedule();
    },
    { capture: true, signal },
  );
  window.visualViewport?.addEventListener("resize", schedule, { signal });
  window.visualViewport?.addEventListener("scroll", schedule, { signal });
  if (typeof ResizeObserver !== "undefined") {
    const observer = new ResizeObserver(schedule);
    observer.observe(anchor);
    observer.observe(root);
    signal.addEventListener("abort", () => {
      observer.disconnect();
    });
  }
  signal.addEventListener("abort", () => {
    cancelAnimationFrame(frame);
    frame = 0;
  });

  return (): void => {
    controller.abort();
  };
};
