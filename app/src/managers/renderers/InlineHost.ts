import { createElement } from "../../utils/dom";
import type { SurfaceHost } from "./SurfaceHost";

export class InlineHost implements SurfaceHost {
  readonly root: HTMLElement;
  readonly body: HTMLElement;

  constructor(options: { container: HTMLElement; label: string }) {
    this.root = createElement(
      "div",
      "dp-ui__container dp-ui__container--inline",
      { role: "group", "aria-label": options.label },
    );
    this.body = this.root;
    options.container.appendChild(this.root);
  }

  open(): Promise<void> {
    return Promise.resolve();
  }

  close(): Promise<void> {
    return Promise.resolve();
  }

  destroy(): void {
    this.root.remove();
  }
}
