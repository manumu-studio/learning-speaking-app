// Landing page section showcasing 3 core app features with animated cards
'use client';

import { Mic, Brain, TrendingUp } from 'lucide-react';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import type { FeatureShowcaseProps, FeatureCardData } from './FeatureShowcase.types';

const FEATURES: FeatureCardData[] = [
  {
    icon: 'mic',
    title: 'AI Speech Analysis',
    description:
      'Record yourself speaking naturally. Our AI transcribes your speech and analyzes fluency, vocabulary precision, and communication clarity in real time.',
  },
  {
    icon: 'brain',
    title: 'Pattern Detection',
    description:
      'Identify recurring habits — filler words, connector repetition, structural patterns — that native speakers notice but textbooks never teach.',
  },
  {
    icon: 'trending-up',
    title: 'Progress Tracking',
    description:
      'Track your improvement across sessions. See how your speaking patterns evolve with structured metrics and actionable insights.',
  },
];

const ICON_MAP = {
  mic: Mic,
  brain: Brain,
  'trending-up': TrendingUp,
} as const;

export function FeatureShowcase({ className = '' }: FeatureShowcaseProps) {
  return (
    <section
      aria-label="Product features"
      className={`py-24 md:py-32 bg-gray-50 dark:bg-zinc-950 transition-colors duration-200 ${className}`}
    >
      <div className="max-w-6xl mx-auto px-4">
        <ScrollReveal className="text-center mb-16">
          <p className="text-sm tracking-widest uppercase text-black/40 dark:text-white/40 mb-4">
            What You Get
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Speak with confidence
          </h2>
          <p className="text-lg text-gray-600 dark:text-white/60 max-w-2xl mx-auto">
            Three powerful capabilities designed to take your English from good to exceptional.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FEATURES.map((feature, index) => {
            const IconComponent = ICON_MAP[feature.icon];
            return (
              <ScrollReveal key={feature.icon} delay={index * 150}>
                <div className="group rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 backdrop-blur-sm p-8 transition-colors duration-200 hover:bg-black/[0.08] dark:hover:bg-white/[0.08] hover:border-black/20 dark:hover:border-white/20 cursor-pointer">
                  <div className="w-12 h-12 rounded-xl bg-black/10 dark:bg-white/10 flex items-center justify-center mb-6 transition-colors duration-200 group-hover:bg-black/15 dark:group-hover:bg-white/15">
                    <IconComponent className="w-6 h-6 text-gray-700 dark:text-white/80" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-white/60 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
