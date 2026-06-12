// HeroCanvas utility types, constants, and canvas draw helpers
import { FilmGrain } from './FilmGrain';
export { FilmGrain } from './FilmGrain';

export interface WaveConfig {
  amplitude: number;
  frequency: number;
  speed: number;
  offset: number;
  opacity: number;
}

export interface ColorState {
  hue: number;
  targetHue: number;
  saturation: number;
  targetSaturation: number;
  lightness: number;
  targetLightness: number;
}

export interface BeamState {
  bassIntensity: number;
  midIntensity: number;
  trebleIntensity: number;
  time: number;
  filmGrain: FilmGrain | null;
  colorState: ColorState;
  waves: WaveConfig[];
  postProcessing: {
    filmGrainIntensity: number;
    vignetteIntensity: number;
    scanlineIntensity: number;
  };
}

// Blue palette: hue stays in 200–240 range (deep sky → electric blue)
export const BLUE_BASE_HUE = 215;
export const BLUE_HUE_RANGE = 20;

// ─── Draw helpers ─────────────────────────────────────────────────────────────

/** Advance color-state targets for the current frame */
export function advanceColorState(beam: BeamState, isLight: boolean): void {
  beam.bassIntensity = 0.4 + Math.sin(beam.time * 0.01) * 0.3;
  beam.midIntensity = 0.3 + Math.sin(beam.time * 0.015) * 0.2;
  beam.trebleIntensity = 0.2 + Math.sin(beam.time * 0.02) * 0.1;

  const hueRange = isLight ? 10 : BLUE_HUE_RANGE;
  beam.colorState.targetHue = BLUE_BASE_HUE + Math.sin(beam.time * 0.005) * hueRange;
  beam.colorState.targetSaturation = isLight
    ? 60 + Math.sin(beam.time * 0.01) * 10
    : 70 + Math.sin(beam.time * 0.01) * 20;
  beam.colorState.targetLightness = isLight
    ? 65 + Math.sin(beam.time * 0.008) * 8
    : 55 + Math.sin(beam.time * 0.008) * 15;

  beam.colorState.hue += (beam.colorState.targetHue - beam.colorState.hue) * 0.5;
  beam.colorState.saturation +=
    (beam.colorState.targetSaturation - beam.colorState.saturation) * 0.2;
  beam.colorState.lightness +=
    (beam.colorState.targetLightness - beam.colorState.lightness) * 0.1;

  beam.time++;
}

/** Draw all wave layers onto the canvas */
export function drawWaves(
  ctx: CanvasRenderingContext2D,
  beam: BeamState,
  canvas: HTMLCanvasElement,
  isLight: boolean,
): void {
  const centerY = canvas.height / 2;

  beam.waves.forEach((wave, waveIndex) => {
    wave.offset += wave.speed * (1 + beam.bassIntensity * 0.8);

    const freqInfluence = waveIndex < 2 ? beam.bassIntensity : beam.midIntensity;
    const amplitudeScale = isLight ? 2.5 : 5;
    const dynamicAmplitude = wave.amplitude * (1 + freqInfluence * amplitudeScale);

    const rawWaveHue = beam.colorState.hue + waveIndex * (isLight ? 2 : 5);
    const waveHue = isLight ? Math.min(rawWaveHue, 230) : rawWaveHue;
    const waveSaturation = beam.colorState.saturation - waveIndex * 3;
    const waveLightness = beam.colorState.lightness + waveIndex * 4;

    const gradient = ctx.createLinearGradient(
      0, centerY - dynamicAmplitude,
      0, centerY + dynamicAmplitude,
    );
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
}

/** Draw scanlines (dark mode only) */
export function drawScanlines(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  intensity: number,
): void {
  ctx.strokeStyle = `rgba(0, 0, 0, ${intensity})`;
  ctx.lineWidth = 1;
  for (let y = 0; y < canvas.height; y += 3) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

/** Draw radial vignette */
export function drawVignette(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  vigAlpha: number,
  isLight: boolean,
): void {
  const vignette = ctx.createRadialGradient(
    canvas.width / 2, canvas.height / 2, canvas.width * 0.2,
    canvas.width / 2, canvas.height / 2, canvas.width * 0.9,
  );
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
}

/** Draw film dust particles (probabilistic — ~2% of frames) */
export function drawFilmDust(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  isLight: boolean,
): void {
  if (Math.random() >= 0.02) return;
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

/** Draw film flicker overlay */
export function drawFilmFlicker(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  time: number,
  isLight: boolean,
): void {
  const flicker = Math.sin(time * 0.3) * 0.02 + Math.random() * 0.01;
  ctx.fillStyle = isLight
    ? `rgba(200, 220, 255, ${flicker})`
    : `rgba(255, 255, 255, ${flicker})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

/** Draw dark-mode color grade via overlay composite */
export function drawColorGrade(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
): void {
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

/** Draw rare film scratch (probabilistic — ~0.5% of frames) */
export function drawFilmScratch(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  isLight: boolean,
): void {
  if (Math.random() >= 0.005) return;
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
