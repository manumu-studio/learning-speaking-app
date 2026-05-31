// Hook for PillarTooltip interaction — mobile tap vs desktop hover, single-open constraint
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { PillarKey } from '@/features/dashboard/pillars';

type TooltipState = PillarKey | null;

interface UsePillarTooltipReturn {
  openPillar: TooltipState;
  getTriggerProps: (pillarKey: PillarKey) => {
    onClick: () => void;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    'aria-expanded': boolean;
  };
  getTooltipProps: (pillarKey: PillarKey) => {
    isOpen: boolean;
    onClose: () => void;
  };
}

export function usePillarTooltip(): UsePillarTooltipReturn {
  const [openPillar, setOpenPillar] = useState<TooltipState>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isHoverDeviceRef = useRef(false);

  useEffect(() => {
    isHoverDeviceRef.current = window.matchMedia('(hover: hover)').matches;
  }, []);

  const close = useCallback(() => {
    setOpenPillar(null);
  }, []);

  const getTriggerProps = useCallback(
    (pillarKey: PillarKey) => ({
      onClick: () => {
        if (!isHoverDeviceRef.current) {
          setOpenPillar((prev) => (prev === pillarKey ? null : pillarKey));
        }
      },
      onMouseEnter: () => {
        if (isHoverDeviceRef.current) {
          if (hoverTimeoutRef.current !== null) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
          }
          setOpenPillar(pillarKey);
        }
      },
      onMouseLeave: () => {
        if (isHoverDeviceRef.current) {
          hoverTimeoutRef.current = setTimeout(() => {
            setOpenPillar((prev) => (prev === pillarKey ? null : prev));
          }, 100);
        }
      },
      'aria-expanded': openPillar === pillarKey,
    }),
    [openPillar],
  );

  const getTooltipProps = useCallback(
    (pillarKey: PillarKey) => ({
      isOpen: openPillar === pillarKey,
      onClose: close,
    }),
    [openPillar, close],
  );

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current !== null) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  return { openPillar, getTriggerProps, getTooltipProps };
}
