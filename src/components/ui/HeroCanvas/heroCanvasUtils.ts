// HeroCanvas utility types, constants, and FilmGrain class — extracted from HeroCanvas.tsx

/** Film grain generator for cinematic post-processing */
export class FilmGrain {
  private width: number;
  private height: number;
  private grainCanvas: HTMLCanvasElement;
  private grainCtx: CanvasRenderingContext2D;
  private grainData: ImageData | null = null;
  private frame = 0;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.grainCanvas = document.createElement('canvas');
    this.grainCanvas.width = width;
    this.grainCanvas.height = height;
    const ctx = this.grainCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2d context for film grain canvas');
    }
    this.grainCtx = ctx;
    this.generateGrainPattern();
  }

  private generateGrainPattern(): void {
    const imageData = this.grainCtx.createImageData(this.width, this.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const value = Math.random() * 255;
      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
      data[i + 3] = 255;
    }

    this.grainData = imageData;
  }

  update(): void {
    this.frame++;
    if (this.frame % 2 !== 0 || !this.grainData) return;

    const data = this.grainData.data;
    const time = this.frame * 0.01;

    for (let i = 0; i < data.length; i += 4) {
      const grain = Math.random();
      const x = (i / 4) % this.width;
      const y = Math.floor((i / 4) / this.width);
      const pattern = Math.sin(x * 0.01 + time) * Math.cos(y * 0.01 - time);
      const value = (grain * 0.8 + pattern * 0.2) * 255;

      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
    }

    this.grainCtx.putImageData(this.grainData, 0, 0);
  }

  apply(ctx: CanvasRenderingContext2D, intensity: number, hue: number, isLight = false): void {
    ctx.save();

    if (isLight) {
      // Light mode: soft-light only — no multiply (multiply on white = dark static)
      ctx.globalCompositeOperation = 'soft-light';
      ctx.globalAlpha = intensity * 0.15;
      ctx.drawImage(this.grainCanvas, 0, 0);
    } else {
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = intensity * 0.5;
      ctx.drawImage(this.grainCanvas, 0, 0);

      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = 1 - intensity * 0.3;
      ctx.drawImage(this.grainCanvas, 0, 0);

      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = intensity * 0.3;
      ctx.fillStyle = `hsla(${hue}, 50%, 50%, 1)`;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    ctx.restore();
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.grainCanvas.width = width;
    this.grainCanvas.height = height;
    this.generateGrainPattern();
  }
}

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
