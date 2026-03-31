// Form submit button with automatic loading spinner via useFormStatus
'use client';

import { useFormStatus } from 'react-dom';
import type { SubmitButtonProps } from './SubmitButton.types';

function ButtonInner({
  children,
  className = '',
  pendingText,
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`${className} ${pending ? 'opacity-80 cursor-wait' : ''}`}
    >
      {pending ? (
        <span className="inline-flex items-center justify-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          {pendingText ?? children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}

export function SubmitButton(props: SubmitButtonProps) {
  return <ButtonInner {...props} />;
}
