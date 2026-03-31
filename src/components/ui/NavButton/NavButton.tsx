// Client-side navigation button — shows spinner while route transition is in progress
'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import type { NavButtonProps } from './NavButton.types';

export function NavButton({ href, children, className = '' }: NavButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [clicked, setClicked] = useState(false);

  const isLoading = isPending || clicked;

  const handleClick = () => {
    setClicked(true);
    startTransition(() => {
      router.push(href);
    });
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`${className} ${isLoading ? 'opacity-80 cursor-wait' : ''}`}
    >
      {isLoading ? (
        <span className="inline-flex items-center justify-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Loading...
        </span>
      ) : (
        children
      )}
    </button>
  );
}
