import { EASING, TIMINGS } from "@/constants/timings";
import { motionMode } from "@/utils/accessibility";

export interface SlideAnimator {
  run(from: string, to: string, complete: () => void): void;
  finish(): void;
  cancel(): void;
}

interface Motion {
  readonly animation: Animation;
  readonly complete: () => void;
}

export const createSlideAnimator = (
  track: HTMLElement,
  animate: boolean,
): SlideAnimator => {
  let motion: Motion | null = null;
  let fade: Animation | null = null;

  const canAnimate = (): boolean => typeof track.animate === "function";

  const stopFade = (): void => {
    const current = fade;
    fade = null;
    current?.cancel();
  };

  const finish = (): void => {
    stopFade();
    const current = motion;
    if (!current) return;
    motion = null;
    current.complete();
    current.animation.cancel();
  };

  const cancel = (): void => {
    stopFade();
    const current = motion;
    motion = null;
    current?.animation.cancel();
  };

  const fadeIn = (): void => {
    const animation = track.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: TIMINGS.REDUCED_FADE,
      easing: "linear",
    });
    fade = animation;
    const release = (): void => {
      if (fade === animation) fade = null;
    };
    void animation.finished.then(release, release);
  };

  const run = (from: string, to: string, complete: () => void): void => {
    stopFade();
    const mode = motionMode(animate);
    if (from === to || mode === "none" || !canAnimate()) {
      complete();
      return;
    }
    if (mode === "reduced") {
      complete();
      fadeIn();
      return;
    }
    const animation = track.animate([{ transform: from }, { transform: to }], {
      duration: TIMINGS.PAGER_SETTLE,
      easing: EASING.EMPHASIZED,
      fill: "forwards",
    });
    const current: Motion = { animation, complete };
    motion = current;
    void animation.finished.then(
      () => {
        if (motion === current) finish();
      },
      () => undefined,
    );
  };

  return { run, finish, cancel };
};
