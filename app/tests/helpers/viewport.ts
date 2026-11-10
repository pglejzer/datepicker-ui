export const setViewportWidth = (px: number): void => {
  Object.defineProperty(window, "innerWidth", {
    value: px,
    writable: true,
    configurable: true,
  });
  window.dispatchEvent(new Event("resize"));
};

export const setViewportHeight = (px: number): void => {
  Object.defineProperty(window, "innerHeight", {
    value: px,
    writable: true,
    configurable: true,
  });
};

export const setViewportSize = (width: number, height: number): void => {
  setViewportHeight(height);
  setViewportWidth(width);
};
