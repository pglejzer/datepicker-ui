import { rethrowLater } from "./rethrow";

export class TaskQueue {
  private tail: Promise<void> = Promise.resolve();
  private pending = 0;
  private stopped = false;

  run(task: () => Promise<void>): Promise<void> {
    const start = async (): Promise<void> => {
      if (!this.stopped) {
        await task();
      }
    };
    const started = this.pending === 0 ? start() : this.tail.then(start);
    this.pending += 1;
    const settled = started.catch(rethrowLater).finally(() => {
      this.pending -= 1;
    });
    this.tail = settled;
    return settled;
  }

  stop(): void {
    this.stopped = true;
  }
}
