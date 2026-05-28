// Animated canvas background with blue wave visualization and film grain effects
'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { FilmGrain, BLUE_BASE_HUE, BLUE_HUE_RANGE } from './heroCanvasUtils';
import type { BeamState } from './heroCanvasUtils';

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

    const beam: BeamState = {
      bassIntensity: 0,
      midIntensity: 0,
      trebleIntensity: 0,
      time: 0,
      filmGrain: null,
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

    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);

      const isLight = themeRef.current === 'light';

      // Background fade — dark mode: near-black, light mode: clean white
      ctx.fillStyle = isLight ? 'rgba(255, 255, 255, 0.96)' : 'rgba(0, 0, 0, 0.92)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Ambient motion
      beam.bassIntensity = 0.4 + Math.sin(beam.time * 0.01) * 0.3;
      beam.midIntensity = 0.3 + Math.sin(beam.time * 0.015) * 0.2;
      beam.trebleIntensity = 0.2 + Math.sin(beam.time * 0.02) * 0.1;

      // Lock to blue palette — tighter range in light mode to avoid violet drift
      const hueRange = isLight ? 10 : BLUE_HUE_RANGE;
      beam.colorState.targetHue = BLUE_BASE_HUE + Math.sin(beam.time * 0.005) * hueRange;
      beam.colorState.targetSaturation = isLight
        ? 60 + Math.sin(beam.time * 0.01) * 10
        : 70 + Math.sin(beam.time * 0.01) * 20;
      beam.colorState.targetLightness = isLight
        ? 65 + Math.sin(beam.time * 0.008) * 8   // light, airy blues
        : 55 + Math.sin(beam.time * 0.008) * 15;

      beam.colorState.hue += (beam.colorState.targetHue - beam.colorState.hue) * 0.5;
      beam.colorState.saturation += (beam.colorState.targetSaturation - beam.colorState.saturation) * 0.2;
      beam.colorState.lightness += (beam.colorState.targetLightness - beam.colorState.lightness) * 0.1;

      beam.time++;

      const centerY = canvas.height / 2;

      // Draw waves
      beam.waves.forEach((wave, waveIndex) => {
        wave.offset += wave.speed * (1 + beam.bassIntensity * 0.8);

        const freqInfluence = waveIndex < 2 ? beam.bassIntensity : beam.midIntensity;
        // Light mode: less amplitude growth so waves stay subtle
        const amplitudeScale = isLight ? 2.5 : 5;
        const dynamicAmplitude = wave.amplitude * (1 + freqInfluence * amplitudeScale);

        // Light mode: tighter hue shift, clamped to 200–230 to stay blue not purple
        const rawWaveHue = beam.colorState.hue + waveIndex * (isLight ? 2 : 5);
        const waveHue = isLight ? Math.min(rawWaveHue, 230) : rawWaveHue;
        const waveSaturation = beam.colorState.saturation - waveIndex * 3;
        const waveLightness = beam.colorState.lightness + waveIndex * 4;

        const gradient = ctx.createLinearGradient(0, centerY - dynamicAmplitude, 0, centerY + dynamicAmplitude);
        // Light mode: keep opacity low so waves feel atmospheric, not graphic
        const alpha = isLight
          ? wave.opacity * (0.35 + beam.bassIntensity * 0.2)
          : wave.opacity * (0.5 + beam.bassIntensity * 0.5);

        gradient.addColorStop(0, `hsla(${waveHue}, ${waveSaturation}%, ${waveLightness}%, 0)`);
        gradient.addColorStop(0.5, `hsla(${waveHue}, ${waveSaturation}%, ${waveLightness + 10}%, ${alpha})`);
        gradient.addColorStop(1, `hsla(${waveHue}, ${waveSaturation}%, ${waveLightness}%, 0)`);

        ctx.beginPath();
        for (let x = -50; x <= canvas.width + 50; x += 2) {
          const y1 = Math.sin(x * wave.frequency + wave.offset) * dynamicAmplitude;
          const y2 = Math.sin(x * wave.frequency * 2 + wave.offset * 1.5) * (dynamicAmplitude * 0.3 * beam.midIntensity);
          const y3 = Math.sin(x * wave.frequency * 0.5 + wave.offset * 0.7) * (dynamicAmplitude * 0.5);
          const y = centerY + y1 + y2 + y3;

          if (x === -50) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        ctx.lineTo(canvas.width + 50, canvas.height);
        ctx.lineTo(-50, canvas.height);
        ctx.closePath();

        ctx.fillStyle = gradient;
        ctx.fill();
      });

      // Film grain — reduced intensity in light mode
      if (beam.filmGrain) {
        beam.filmGrain.update();
        const grainIntensity = isLight ? 0.012 : beam.postProcessing.filmGrainIntensity;
        beam.filmGrain.apply(ctx, grainIntensity, beam.colorState.hue, isLight);
      }

      // Scanlines — dark mode only (invisible on white and add noise)
      if (!isLight) {
        ctx.strokeStyle = `rgba(0, 0, 0, ${beam.postProcessing.scanlineIntensity})`;
        ctx.lineWidth = 1;
        for (let y = 0; y < canvas.height; y += 3) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
        }
      }

      // Vignette — dark in dark mode, subtle blue-tinted in light mode
      const vignette = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, canvas.width * 0.2,
        canvas.width / 2, canvas.height / 2, canvas.width * 0.9
      );
      const vigAlpha = beam.postProcessing.vignetteIntensity;
      if (isLight) {
        vignette.addColorStop(0, 'rgba(240, 245, 255, 0)');
        vignette.addColorStop(0.5, `rgba(220, 235, 255, ${vigAlpha * 0.2})`);
        vignette.addColorStop(1, `rgba(200, 220, 255, ${vigAlpha * 0.5})`);
      } else {
        vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vignette.addColorStop(0.5, `rgba(0, 0, 0, ${vigAlpha * 0.3})`);
        vignette.addColorStop(0.8, `rgba(0, 0, 0, ${vigAlpha * 0.6})`);
        vignette.addColorStop(1, `rgba(0, 0, 0, ${vigAlpha})`);
      }
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Film dust
      if (Math.random() < 0.02) {
        const dustCount = Math.floor(Math.random() * 5) + 1;
        for (let i = 0; i < dustCount; i++) {
          const x = Math.random() * canvas.width;
          const y = Math.random() * canvas.height;
          const size = Math.random() * 2 + 0.5;
          ctx.fillStyle = isLight
            ? `rgba(180, 200, 240, ${Math.random() * 0.4})`
            : `rgba(255, 255, 255, ${Math.random() * 0.3})`;
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Film flicker
      const flicker = Math.sin(beam.time * 0.3) * 0.02 + Math.random() * 0.01;
      ctx.fillStyle = isLight
        ? `rgba(200, 220, 255, ${flicker})`
        : `rgba(255, 255, 255, ${flicker})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Subtle color grading — dark mode only
      if (!isLight) {
        ctx.save();
        ctx.globalCompositeOperation = 'overlay';
        ctx.globalAlpha = 0.06;
        const colorGrade = ctx.createLinearGradient(0, 0, 0, canvas.height);
        colorGrade.addColorStop(0, 'rgb(200, 220, 255)');
        colorGrade.addColorStop(0.5, 'rgb(220, 235, 255)');
        colorGrade.addColorStop(1, 'rgb(180, 210, 255)');
        ctx.fillStyle = colorGrade;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
      }

      // Film scratches (rare)
      if (Math.random() < 0.005) {
        ctx.strokeStyle = isLight
          ? `rgba(150, 190, 255, ${Math.random() * 0.2 + 0.1})`
          : `rgba(255, 255, 255, ${Math.random() * 0.2 + 0.1})`;
        ctx.lineWidth = Math.random() * 2 + 0.5;
        ctx.beginPath();
        const scratchX = Math.random() * canvas.width;
        ctx.moveTo(scratchX, 0);
        ctx.lineTo(scratchX + (Math.random() - 0.5) * 20, canvas.height);
        ctx.stroke();
      }
    };

    animate();

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
