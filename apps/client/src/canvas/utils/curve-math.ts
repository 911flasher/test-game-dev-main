const GROWTH_RATE = 0.00006;

export function getMultiplierAtTime(elapsedMs: number): number {
  return Math.pow(Math.E, elapsedMs * GROWTH_RATE);
}

export function getTimeAtMultiplier(multiplier: number): number {
  return Math.log(multiplier) / GROWTH_RATE;
}

export interface ViewportBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export function calculateViewport(
  currentMultiplier: number,
  elapsedMs: number,
  _canvasWidth: number,
  _canvasHeight: number,
): ViewportBounds {
  const padding = 1.3;
  return {
    minX: 0,
    maxX: elapsedMs * padding,
    minY: 0.8,
    maxY: Math.max(2, currentMultiplier * padding),
  };
}

export function worldToScreen(
  time: number,
  multiplier: number,
  viewport: ViewportBounds,
  canvasWidth: number,
  canvasHeight: number,
  margin = 60,
): { x: number; y: number } {
  const plotWidth = canvasWidth - margin * 2;
  const plotHeight = canvasHeight - margin * 2;
  const x = margin + (time / viewport.maxX) * plotWidth;
  const y =
    canvasHeight -
    margin -
    ((multiplier - viewport.minY) / (viewport.maxY - viewport.minY)) * plotHeight;
  return { x, y };
}
