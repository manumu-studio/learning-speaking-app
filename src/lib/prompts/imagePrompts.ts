// Metadata for image-based speaking prompts — users describe and discuss a photograph

import type { CefrLevel } from './promptLibrary.types';

export interface ImagePromptMeta {
  readonly id: string;
  readonly imagePath: string;
  readonly alt: string;
  readonly guidance: string;
  readonly cefrLevel: CefrLevel;
}

export const IMAGE_PROMPTS: readonly ImagePromptMeta[] = [
  {
    id: 'img-busy-market',
    imagePath: '/prompts/images/busy-city-market.webp',
    alt: 'A crowded outdoor city market with colourful stalls selling fruit, vegetables, and street food',
    guidance: 'Describe the scene, then say what you think it would feel like to visit this market.',
    cefrLevel: 'B1',
  },
  {
    id: 'img-remote-office',
    imagePath: '/prompts/images/remote-office-setup.webp',
    alt: 'A minimalist home office with a laptop, coffee cup, plant, and large window overlooking a garden',
    guidance: 'Describe this workspace and discuss whether you would be productive working here.',
    cefrLevel: 'B2',
  },
  {
    id: 'img-rush-hour',
    imagePath: '/prompts/images/rush-hour-commute.webp',
    alt: 'A packed subway platform during rush hour with commuters in business attire waiting for a train',
    guidance: 'Describe what you see and compare it to commuting in your city.',
    cefrLevel: 'B2',
  },
  {
    id: 'img-mountain-trail',
    imagePath: '/prompts/images/mountain-trail-sunrise.webp',
    alt: 'A narrow hiking trail winding through misty mountains at sunrise with golden light on the peaks',
    guidance: 'Describe the landscape, then explain whether this kind of activity appeals to you and why.',
    cefrLevel: 'B1',
  },
  {
    id: 'img-classroom',
    imagePath: '/prompts/images/modern-classroom.webp',
    alt: 'A modern university classroom with students using laptops while a professor writes on a digital whiteboard',
    guidance: 'Describe the learning environment and compare it to your own educational experience.',
    cefrLevel: 'C1',
  },
  {
    id: 'img-elderly-park',
    imagePath: '/prompts/images/elderly-couple-park.webp',
    alt: 'An elderly couple sitting on a park bench feeding pigeons, surrounded by autumn leaves',
    guidance: 'Describe the scene, then reflect on what this image says about ageing and community.',
    cefrLevel: 'C1',
  },
  {
    id: 'img-protest-march',
    imagePath: '/prompts/images/peaceful-protest-march.webp',
    alt: 'A large peaceful protest march on a wide boulevard with diverse participants holding handmade signs',
    guidance: 'Describe what is happening, then discuss the role of public protest in a democracy.',
    cefrLevel: 'C2',
  },
  {
    id: 'img-abandoned-factory',
    imagePath: '/prompts/images/abandoned-factory.webp',
    alt: 'An abandoned industrial factory with broken windows, overgrown vegetation, and rusting machinery',
    guidance: 'Describe the scene and speculate about its history — what might have happened here and what it represents about economic change.',
    cefrLevel: 'C2',
  },
] as const;
