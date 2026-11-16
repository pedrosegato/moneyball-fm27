import { useLayoutEffect, useRef } from "react";
import { TIERS } from "@/lib/quality";
import { dotStyle } from "../lib/layout";
import { markColor, NO_MARK, type PointLevels } from "../lib/levels";
import { useDevicePixelRatio } from "./useDevicePixelRatio";

const DRAW_START = "scatter-draw-start";
const DRAW = "scatter-draw";
const NO_TIER = -1;

interface DotCanvasInput {
  px: Float32Array;
  py: Float32Array;
  levels: PointLevels | null;
  width: number;
  height: number;
  theme?: string;
}

export function useDotCanvas({ px, py, levels, width, height, theme }: DotCanvasInput) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const dpr = useDevicePixelRatio();
  const dots = dotStyle(px.length);

  useLayoutEffect(() => {
    const el = canvas.current;
    if (!el || !width || !height) return;
    el.width = Math.round(width * dpr);
    el.height = Math.round(height * dpr);
    const ctx = el.getContext("2d");
    if (!ctx) return;
    if (theme) el.dataset.theme = theme;
    performance.clearMarks(DRAW_START);
    performance.clearMeasures(DRAW);
    performance.mark(DRAW_START);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = dots.alpha;
    const style = getComputedStyle(el);
    const draw = (tier: number) => {
      for (let k = 0; k < px.length; k++) {
        if (levels && levels.tier[k] !== tier) continue;
        ctx.beginPath();
        ctx.arc(px[k], py[k], dots.r, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    if (!levels) {
      ctx.fillStyle = markColor(style, NO_MARK);
      draw(NO_TIER);
    } else {
      for (let t = TIERS.length - 1; t >= 0; t--) {
        ctx.fillStyle = markColor(style, TIERS[t]);
        draw(t);
      }
    }
    performance.measure(DRAW, DRAW_START);
  }, [px, py, levels, width, height, dpr, dots.r, dots.alpha, theme]);

  return canvas;
}
