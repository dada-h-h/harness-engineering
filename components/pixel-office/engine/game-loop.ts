/**
 * RAF 기반 게임 루프
 * pixel-agents webview-ui/src/office/engine/gameLoop.ts 포팅
 */

const MAX_DELTA_TIME_SEC = 0.1;

export interface GameLoopCallbacks {
  update: (dt: number) => void;
  render: (ctx: CanvasRenderingContext2D) => void;
}

export function startGameLoop(
  canvas: HTMLCanvasElement,
  callbacks: GameLoopCallbacks,
): () => void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};

  ctx.imageSmoothingEnabled = false;

  let lastTime = 0;
  let rafId = 0;
  let stopped = false;

  const frame = (time: number) => {
    if (stopped) return;
    const dt =
      lastTime === 0 ? 0 : Math.min((time - lastTime) / 1000, MAX_DELTA_TIME_SEC);
    lastTime = time;

    callbacks.update(dt);
    ctx.imageSmoothingEnabled = false;
    callbacks.render(ctx);

    rafId = requestAnimationFrame(frame);
  };

  rafId = requestAnimationFrame(frame);

  return () => {
    stopped = true;
    cancelAnimationFrame(rafId);
  };
}
