// Client wrapper for mobile bottom tab bar + more sheet state
'use client';

import { useState, useCallback } from 'react';
import { BottomTabBar } from '@/components/ui/BottomTabBar';
import { MoreSheet } from '@/components/ui/MoreSheet';

export function MobileNav() {
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const handleMorePress = useCallback(() => {
    setIsMoreOpen(true);
  }, []);

  const handleMoreClose = useCallback(() => {
    setIsMoreOpen(false);
  }, []);

  return (
    <>
      <BottomTabBar onMorePress={handleMorePress} />
      <MoreSheet isOpen={isMoreOpen} onClose={handleMoreClose} />
    </>
  );
}
