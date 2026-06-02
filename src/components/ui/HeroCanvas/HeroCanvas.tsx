// Animated canvas background with blue wave visualization and film grain effects
'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useTheme } from 'next-themes';
import {
  FilmGrain,
  BLUE_BASE_HUE,
  advanceColorState,
  drawWaves,
  drawScanlines,
  drawVignette,
  drawFilmDust,
  drawFilmFlicker,
  drawColorGrade,
  drawFilmScratch,
} from './heroCanvasUtils';
import type { BeamState } from './heroCanvasUtils';

const INITIAL_BEAM: Omit<BeamState, 'filmGrain'> = {
  bassIntensity: 0,
  midIntensity: 0,
  trebleIntensity: 0,
  time: 0,
  colorState: {
    hue: BLUE_BASE_HUE,
    targetHue: BLUE_BASE_HUE,
    saturation: 80,
    targetSaturation: 80,
    lightness: 50,
    targetLightness: 50,
  },
  waves: [
    { amplitude: 30, frequency: 0.003, speed: 0.02, offset: 0, opacity: 0.9 },
    { amplitude: 25, frequency: 0.004, speed: 0.015, offset: Math.PI * 0.5, opacity: 0.7 },
    { amplitude: 20, frequency: 0.005, speed: 0.025, offset: Math.PI, opacity: 0.5 },
    { amplitude: 35, frequency: 0.002, speed: 0.01, offset: Math.PI * 1.5, opacity: 0.6 },
  ],
  postProcessing: {
    filmGrainIntensity: 0.04,
    vignetteIntensity: 0.4,
    scanlineIntensity: 0.02,
  },
};

interface AnimationLoopRefs {
  animationRef: React.MutableRefObject<number>;
  themeRef: React.MutableRefObject<string | undefined>;
}

/** Run a single animation frame and schedule the next */
function runAnimationFrame(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  beam: BeamState,
  refs: AnimationLoopRefs,
) {
  const isLight = refs.themeRef.current === 'light';

  ctx.fillStyle = isLight ? 'rgba(255, 255, 255, 0.96)' : 'rgba(0, 0, 0, 0.92)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  advanceColorState(beam, isLight);
  drawWaves(ctx, beam, canvas, isLight);

  if (beam.filmGrain) {
    beam.filmGrain.update();
    const grainIntensity = isLight ? 0.012 : beam.postProcessing.filmGrainIntensity;
    beam.filmGrain.apply(ctx, grainIntensity, beam.colorState.hue, isLight);
  }

  if (!isLight) {
    drawScanlines(ctx, canvas, beam.postProcessing.scanlineIntensity);
  }

  drawVignette(ctx, canvas, beam.postProcessing.vignetteIntensity, isLight);
  drawFilmDust(ctx, canvas, isLight);
  drawFilmFlicker(ctx, canvas, beam.time, isLight);

  if (!isLight) {
    drawColorGrade(ctx, canvas);
  }

  drawFilmScratch(ctx, canvas, isLight);

  refs.animationRef.current = requestAnimationFrame(() =>
    runAnimationFrame(ctx, canvas, beam, refs),
  );
}

export function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const beamRef = useRef<BeamState | null>(null);
  const { resolvedTheme } = useTheme();
  const themeRef = useRef(resolvedTheme);

  // Keep themeRef in sync without restarting the animation loop
  useEffect(() => {
    themeRef.current = resolvedTheme;
  }, [resolvedTheme]);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const beam: BeamState = { ...INITIAL_BEAM, filmGrain: null };
    beamRef.current = beam;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      canvas.width = parent?.clientWidth ?? window.innerWidth;
      canvas.height = parent?.clientHeight ?? window.innerHeight;
      if (beam.filmGrain) {
        beam.filmGrain.resize(canvas.width, canvas.height);
      } else {
        beam.filmGrain = new FilmGrain(canvas.width, canvas.height);
      }
    };

    resizeCanvas();
    runAnimationFrame(ctx, canvas, beam, { animationRef, themeRef });

    window.addEventListener('resize', resizeCanvas);
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const cleanup = initCanvas();
    return cleanup;
  }, [initCanvas]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ zIndex: 0 }}
    />
  );
}
