// Image and retell format prompt data — requires imagePath and sourcePassage respectively

import type { LibraryPrompt } from './promptLibrary.types';
import { IMAGE_PROMPTS } from './imagePrompts';
import { RETELL_PASSAGES } from './retellPassages';

const imagePathMap = new Map(IMAGE_PROMPTS.map((p) => [p.id, p.imagePath]));
const retellTextMap = new Map(RETELL_PASSAGES.map((p) => [p.id, p.text]));

function getImagePath(id: string): string {
  const path = imagePathMap.get(id);
  if (path === undefined) throw new Error(`Missing image prompt: ${id}`);
  return path;
}

function getRetellText(id: string): string {
  const text = retellTextMap.get(id);
  if (text === undefined) throw new Error(`Missing retell passage: ${id}`);
  return text;
}

export const IMAGE_FORMAT_PROMPTS = [
  // ── Image format (8) ──────────────────────────────────────────────
  {
    id: 'img-busy-market',
    category: 'Daily',
    cefrLevel: 'B1',
    duration: '120s',
    format: 'image',
    title: 'A busy city market',
    hint: 'Describe what you see and how it makes you feel',
    text: 'Look at this image of a busy city market. Describe the scene and say what visiting it would feel like.',
    imagePath: getImagePath('img-busy-market'),
  },
  {
    id: 'img-remote-office',
    category: 'Professional',
    cefrLevel: 'B2',
    duration: '120s',
    format: 'image',
    title: 'Home office',
    hint: 'Describe the workspace and whether you would thrive there',
    text: 'Look at this home office setup. Describe the workspace and discuss whether you would be productive here.',
    imagePath: getImagePath('img-remote-office'),
  },
  {
    id: 'img-rush-hour',
    category: 'Daily',
    cefrLevel: 'B2',
    duration: '120s',
    format: 'image',
    title: 'Rush hour commute',
    hint: 'Compare this scene to your own commuting experience',
    text: 'Look at this rush hour scene. Describe what you see and compare it to commuting in your city.',
    imagePath: getImagePath('img-rush-hour'),
  },
  {
    id: 'img-mountain-trail',
    category: 'Social',
    cefrLevel: 'B1',
    duration: '120s',
    format: 'image',
    title: 'Mountain trail at sunrise',
    hint: 'Describe the landscape and whether it appeals to you',
    text: 'Look at this mountain trail at sunrise. Describe the landscape and explain whether this kind of activity appeals to you.',
    imagePath: getImagePath('img-mountain-trail'),
  },
  {
    id: 'img-classroom',
    category: 'Academic',
    cefrLevel: 'C1',
    duration: '120s',
    format: 'image',
    title: 'Modern classroom',
    hint: 'Compare this to your own educational experience',
    text: 'Look at this modern classroom. Describe the learning environment and compare it to your own educational experience.',
    imagePath: getImagePath('img-classroom'),
  },
  {
    id: 'img-elderly-park',
    category: 'Social',
    cefrLevel: 'C1',
    duration: '120s',
    format: 'image',
    title: 'Couple in the park',
    hint: 'Reflect on ageing, community, and daily rituals',
    text: 'Look at this image of an elderly couple in a park. Describe the scene and reflect on what it says about ageing and community.',
    imagePath: getImagePath('img-elderly-park'),
  },
  {
    id: 'img-protest-march',
    category: 'Academic',
    cefrLevel: 'C2',
    duration: '180s',
    format: 'image',
    title: 'Peaceful protest',
    hint: 'Describe the event and discuss the role of public protest',
    text: 'Look at this protest march. Describe what is happening and discuss the role of public protest in a democracy.',
    imagePath: getImagePath('img-protest-march'),
  },
  {
    id: 'img-abandoned-factory',
    category: 'Academic',
    cefrLevel: 'C2',
    duration: '180s',
    format: 'image',
    title: 'Abandoned factory',
    hint: 'Speculate about economic change and what this place represents',
    text: 'Look at this abandoned factory. Describe the scene and speculate about its history and what it represents about economic change.',
    imagePath: getImagePath('img-abandoned-factory'),
  },
] as const satisfies readonly LibraryPrompt[];

export const RETELL_FORMAT_PROMPTS = [
  // ── Retell format (8) ─────────────────────────────────────────────
  {
    id: 'retell-tech-revolution',
    category: 'Academic',
    cefrLevel: 'B1',
    duration: '90s',
    format: 'retell',
    title: 'The Quiet Tech Revolution',
    hint: 'Read the passage, then retell the key points in your own words',
    text: 'Read the passage about smartphone adoption, then retell the key points in your own words.',
    sourcePassage: getRetellText('retell-tech-revolution'),
  },
  {
    id: 'retell-ocean-plastic',
    category: 'Academic',
    cefrLevel: 'B2',
    duration: '120s',
    format: 'retell',
    title: 'Ocean Plastic Crisis',
    hint: 'Retell the main argument and key facts',
    text: 'Read the passage about ocean plastic pollution, then retell the main argument and key facts.',
    sourcePassage: getRetellText('retell-ocean-plastic'),
  },
  {
    id: 'retell-solo-travel',
    category: 'Social',
    cefrLevel: 'B1',
    duration: '90s',
    format: 'retell',
    title: 'The Rise of Solo Travel',
    hint: 'Retell the reasons and advice mentioned in the passage',
    text: 'Read the passage about solo travel trends, then retell the reasons and advice mentioned.',
    sourcePassage: getRetellText('retell-solo-travel'),
  },
  {
    id: 'retell-sleep-science',
    category: 'Daily',
    cefrLevel: 'B2',
    duration: '120s',
    format: 'retell',
    title: 'Why Sleep Matters',
    hint: 'Summarise the health evidence and workplace findings',
    text: 'Read the passage about sleep science, then retell the health evidence and workplace findings.',
    sourcePassage: getRetellText('retell-sleep-science'),
  },
  {
    id: 'retell-silk-road',
    category: 'Academic',
    cefrLevel: 'C1',
    duration: '120s',
    format: 'retell',
    title: 'The Ancient Silk Road',
    hint: 'Retell the historical significance and modern parallels',
    text: 'Read the passage about the Silk Road, then retell its historical significance and modern parallels.',
    sourcePassage: getRetellText('retell-silk-road'),
  },
  {
    id: 'retell-street-food',
    category: 'Social',
    cefrLevel: 'B1',
    duration: '90s',
    format: 'retell',
    title: 'Street Food Culture',
    hint: 'Retell the examples and main message about street food',
    text: 'Read the passage about street food culture, then retell the examples and the main message.',
    sourcePassage: getRetellText('retell-street-food'),
  },
  {
    id: 'retell-quantum-basics',
    category: 'Academic',
    cefrLevel: 'C1',
    duration: '120s',
    format: 'retell',
    title: 'Quantum Computing Explained',
    hint: 'Explain the key concepts as if teaching someone',
    text: 'Read the passage about quantum computing, then explain the key concepts as if teaching someone.',
    sourcePassage: getRetellText('retell-quantum-basics'),
  },
  {
    id: 'retell-gig-economy',
    category: 'Professional',
    cefrLevel: 'C2',
    duration: '180s',
    format: 'retell',
    title: 'The Gig Economy Debate',
    hint: 'Retell both sides of the argument and add your own view',
    text: 'Read the passage about the gig economy, then retell both sides of the argument and add your own view.',
    sourcePassage: getRetellText('retell-gig-economy'),
  },
] as const satisfies readonly LibraryPrompt[];
