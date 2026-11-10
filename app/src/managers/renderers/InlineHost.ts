import { createElement } from "../../utils/dom";
import { nameSurface } from "./SurfaceHost";
import type { SurfaceHost } from "./SurfaceHost";

export class InlineHost implements SurfaceHost {
  readonly root: HTMLElement;
  readonly body: HTMLElement;

  constructor(options: {
    container: HTMLElement;
    label: string;
    /** Id, or space-separated ids, of a visible title that names the surface. When set, the root gets `aria-labelledby` and no `aria-label`. */
    labelledBy?: string;
  }) {
    this.root = createElement(
      "div",
      "dp-ui__container dp-ui__container--inline",
      { role: "group" },
    );
    nameSurface(this.root, options.label, options.labelledBy);
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

  setLabel(label: string, labelledBy?: string): void {
    nameSurface(this.root, label, labelledBy);
  }
}
