// Landing page section showing 3-step user flow with connecting line
'use client';

import { Mic, Brain, BarChart3 } from 'lucide-react';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import type { HowItWorksProps, StepData } from './HowItWorks.types';

const STEPS: StepData[] = [
  {
    number: 1,
    icon: 'mic',
    title: 'Record yourself speaking',
    description:
      'Pick a topic or speak freely. The app captures your natural speech patterns — no scripts, no rehearsals.',
  },
  {
    number: 2,
    icon: 'brain',
    title: 'AI analyzes your speech',
    description:
      'Your recording is transcribed and analyzed by AI. It evaluates fluency, vocabulary, grammar patterns, and communication structure.',
  },
  {
    number: 3,
    icon: 'bar-chart-3',
    title: 'Review your insights',
    description:
      'Get detailed feedback on what you did well and what to improve. Track patterns across sessions to see real progress.',
  },
];

const ICON_MAP = {
  mic: Mic,
  brain: Brain,
  'bar-chart-3': BarChart3,
} as const;

export function HowItWorks({ className = '' }: HowItWorksProps) {
  return (
    <section className={`py-24 md:py-32 bg-black ${className}`}>
      <div className="max-w-5xl mx-auto px-4">
        {/* Section header */}
        <ScrollReveal className="text-center mb-20">
          <p className="text-sm tracking-widest uppercase text-white/40 mb-4">
            How It Works
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-white">
            Three simple steps
          </h2>
        </ScrollReveal>

        {/* Steps with connecting line */}
        <div className="relative">
          {/* Connecting line (desktop only) */}
          <div className="hidden md:block absolute top-16 left-[calc(16.67%+24px)] right-[calc(16.67%+24px)] h-px bg-gradient-to-r from-white/0 via-white/20 to-white/0" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
            {STEPS.map((step, index) => {
              const IconComponent = ICON_MAP[step.icon];
              return (
                <ScrollReveal key={step.number} delay={index * 200}>
                  <div className="text-center">
                    {/* Step number + icon */}
                    <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/10 border border-white/20 mb-6">
                      <IconComponent className="w-7 h-7 text-white/80" />
                      <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white text-black text-xs font-bold flex items-center justify-center">
                        {step.number}
                      </span>
                    </div>

                    <h3 className="text-xl font-semibold text-white mb-3">
                      {step.title}
                    </h3>
                    <p className="text-white/60 leading-relaxed max-w-xs mx-auto">
                      {step.description}
                    </p>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
