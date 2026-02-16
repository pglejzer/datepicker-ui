/**
 * SSR Safety Test
 * Ensures DatepickerUI can be imported in Node.js environment without errors
 */

describe('SSR Safety', () => {
  it('should import DatepickerUI without crashing in Node.js-like environment', () => {
    expect(() => {
      require('../src/index');
    }).not.toThrow();
  });

  it('should not access window/document at module top-level', () => {
    const originalWindow = global.window;
    const originalDocument = global.document;

    // @ts-expect-error - testing SSR
    delete global.window;
    // @ts-expect-error - testing SSR
    delete global.document;

    expect(() => {
      // Force re-import
      jest.resetModules();
      require('../src/index');
    }).not.toThrow();

    global.window = originalWindow;
    global.document = originalDocument;
  });
});
