// Tab container for the vocabulary page — Review Queue, All, Collocations
'use client';

import { useState, useEffect } from 'react';
import { z } from 'zod';
import { ReviewQueue } from '../ReviewQueue';
import { VocabStats } from '../VocabStats';
import { VocabItemSchema } from '../vocabulary.schemas';
import type { VocabTab, VocabTabsProps, VocabItem } from './VocabTabs.types';
import { useVocabTabs } from './useVocabTabs';

const VocabListSchema = z.array(VocabItemSchema);

function useVocabList() {
  const [items, setItems] = useState<VocabItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchVocab() {
      try {
        const res = await fetch('/api/users/me/vocabulary');
        if (!res.ok) return;
        const json: unknown = await res.json();
        const parsed = VocabListSchema.safeParse(json);
        if (parsed.success) {
          setItems(parsed.data);
        }
      } finally {
        setIsLoading(false);
      }
    }
    void fetchVocab();
  }, []);

  return { items, isLoading };
}

function VocabListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
      ))}
    </div>
  );
}

function VocabItemCard({ item }: { item: VocabItem }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-2">
        <span className="font-medium text-gray-900 dark:text-gray-100">{item.word}</span>
        {item.firstUsedAt !== null && (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">adopted</span>
        )}
      </div>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{item.meaning}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">{item.domain}</span>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">{item.frequencyBand}</span>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">{item.type}</span>
      </div>
    </div>
  );
}

function AllVocabList({ items, isLoading }: { items: VocabItem[]; isLoading: boolean }) {
  if (isLoading) return <VocabListSkeleton />;
  if (items.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500 dark:text-gray-400">Record a session to start building vocabulary.</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {items.map((item) => <VocabItemCard key={item.id} item={item} />)}
    </div>
  );
}

function CollocationList({ items, isLoading }: { items: VocabItem[]; isLoading: boolean }) {
  const collocations = items.filter((item) => item.type !== 'word');

  if (isLoading) return <VocabListSkeleton />;
  if (collocations.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500 dark:text-gray-400">No collocations or phrases detected yet.</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {collocations.map((item) => <VocabItemCard key={item.id} item={item} />)}
    </div>
  );
}

const TABS: Array<{ key: VocabTab; label: string }> = [
  { key: 'review', label: 'Review Queue' },
  { key: 'all', label: 'All' },
  { key: 'collocations', label: 'Collocations' },
];

export function VocabTabs({ className }: VocabTabsProps) {
  const { activeTab, switchTab } = useVocabTabs();
  const { items: allItems, isLoading: vocabLoading } = useVocabList();

  const collocationCount = allItems.filter((i) => i.type !== 'word').length;

  function tabLabel(tab: VocabTab): string {
    const base = TABS.find((t) => t.key === tab)?.label ?? tab;
    if (tab === 'all' && !vocabLoading) return `${base} (${allItems.length})`;
    if (tab === 'collocations' && !vocabLoading) return `${base} (${collocationCount})`;
    return base;
  }

  return (
    <div className={className}>
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => switchTab(tab.key)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-gray-100'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            {tabLabel(tab.key)}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {activeTab === 'review' && <ReviewQueue />}
        {activeTab === 'all' && <AllVocabList items={allItems} isLoading={vocabLoading} />}
        {activeTab === 'collocations' && <CollocationList items={allItems} isLoading={vocabLoading} />}
      </div>

      <VocabStats className="mt-6" />
    </div>
  );
}
