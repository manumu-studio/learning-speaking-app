// Short reading passages for retell-format prompts — users read then retell in their own words

import type { CefrLevel } from './promptLibrary.types';

export interface RetellPassage {
  readonly id: string;
  readonly title: string;
  readonly text: string;
  readonly cefrLevel: CefrLevel;
  readonly wordCount: number;
}

export const RETELL_PASSAGES: readonly RetellPassage[] = [
  {
    id: 'retell-tech-revolution',
    title: 'The Quiet Tech Revolution',
    cefrLevel: 'B1',
    wordCount: 95,
    text: 'Smartphones changed the way people communicate almost overnight. Before 2007, most people used their phones only for calls and texts. Today, the average person checks their phone over 90 times a day. We use them for banking, navigation, photography, and entertainment. Some experts say this shift happened faster than any previous technology adoption in history. While older generations sometimes struggle with new apps, young children learn to swipe a screen before they can read.',
  },
  {
    id: 'retell-ocean-plastic',
    title: 'Ocean Plastic Crisis',
    cefrLevel: 'B2',
    wordCount: 112,
    text: 'Every year, roughly eight million tonnes of plastic enter the world\'s oceans. Much of it breaks down into microplastics — tiny fragments smaller than five millimetres — that marine animals mistake for food. Researchers have found microplastics in the stomachs of fish sold in supermarkets, in Arctic ice, and even in rainwater. Several countries have banned single-use plastic bags, but critics argue these bans barely scratch the surface. The real solution, many scientists say, lies in redesigning packaging from the start so that every material used can be safely composted or recycled.',
  },
  {
    id: 'retell-solo-travel',
    title: 'The Rise of Solo Travel',
    cefrLevel: 'B1',
    wordCount: 98,
    text: 'Solo travel has grown significantly in the past decade. Tour companies report that bookings from single travellers have doubled since 2015. People travel alone for many reasons: some want freedom to set their own schedule, while others see it as a way to build confidence. Popular solo destinations include Japan, Portugal, and New Zealand, all considered safe and easy to navigate. Experts suggest that first-time solo travellers start with a short trip to a country where English is widely spoken.',
  },
  {
    id: 'retell-sleep-science',
    title: 'Why Sleep Matters',
    cefrLevel: 'B2',
    wordCount: 118,
    text: 'Sleep scientists now believe that getting fewer than seven hours of sleep regularly is as damaging to health as smoking. During deep sleep, the brain clears out toxic waste products linked to Alzheimer\'s disease. The immune system repairs itself, and memories from the day are consolidated into long-term storage. Despite this evidence, modern work culture still celebrates people who sleep less. A 2023 study found that employees who slept six hours or fewer made 30 percent more errors than well-rested colleagues. Some companies have started offering nap rooms, but changing attitudes toward rest remains an uphill battle.',
  },
  {
    id: 'retell-silk-road',
    title: 'The Ancient Silk Road',
    cefrLevel: 'C1',
    wordCount: 130,
    text: 'The Silk Road was not a single road but a vast network of trade routes connecting China to the Mediterranean for over 1,500 years. Merchants carried silk, spices, and precious metals, but they also transmitted ideas, religions, and diseases across continents. Buddhism spread from India to China along these paths, while Islamic scholars preserved Greek philosophy and passed it westward. The Black Death of the 14th century likely travelled the same corridors. Historians argue that globalisation is not a modern phenomenon — the Silk Road created the first truly interconnected economy. Today, China\'s Belt and Road Initiative deliberately echoes this history, investing in infrastructure across Central Asia and Africa.',
  },
  {
    id: 'retell-street-food',
    title: 'Street Food Culture',
    cefrLevel: 'B1',
    wordCount: 92,
    text: 'Street food is an important part of culture in many countries. In Thailand, vendors sell pad thai and mango sticky rice on almost every corner. In Mexico, tacos al pastor are a late-night tradition. Street food is usually cheaper than restaurant meals and often tastes better because recipes have been passed down through families for generations. Recently, some street food vendors have earned Michelin stars, proving that great cooking does not require a fancy kitchen.',
  },
  {
    id: 'retell-quantum-basics',
    title: 'Quantum Computing Explained',
    cefrLevel: 'C1',
    wordCount: 135,
    text: 'Traditional computers store information as bits — zeros and ones. Quantum computers use qubits, which can exist as zero, one, or both simultaneously through a property called superposition. When qubits are entangled, measuring one instantly reveals information about another, regardless of distance. These properties allow quantum machines to explore many solutions at once, making them potentially millions of times faster for specific problems like drug discovery, cryptography, and climate modelling. However, qubits are extremely fragile; even slight vibrations or temperature changes cause errors. Current machines require cooling to near absolute zero. Most experts predict that practical, error-corrected quantum computers are still a decade away, though progress in 2025 exceeded expectations.',
  },
  {
    id: 'retell-gig-economy',
    title: 'The Gig Economy Debate',
    cefrLevel: 'C2',
    wordCount: 140,
    text: 'The gig economy — freelance, contract, and platform-based work — now accounts for roughly 36 percent of the US workforce. Proponents celebrate the flexibility it offers: workers set their own hours and choose their clients. Critics counter that this flexibility is often illusory, masking a lack of health insurance, retirement benefits, and employment protections. Algorithmic management on platforms like ride-sharing apps can penalise workers who decline jobs, effectively recreating the control of traditional employment without the corresponding rights. The European Union has proposed legislation to reclassify many gig workers as employees, while the United States remains divided. The underlying tension — between individual autonomy and collective security — mirrors debates that have shaped labour movements for over a century.',
  },
] as const;
