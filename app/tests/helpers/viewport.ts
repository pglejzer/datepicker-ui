export const setViewportWidth = (px: number): void => {
  Object.defineProperty(window, "innerWidth", {
    value: px,
    writable: true,
    configurable: true,
  });
  window.dispatchEvent(new Event("resize"));
};
