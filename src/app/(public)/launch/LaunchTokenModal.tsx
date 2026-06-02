// LaunchTokenModal — Desktop overlay for entering an invitation token
'use client';

import styles from './launch.module.css';
import type { LaunchTokenModalProps } from './LaunchTokenModal.types';

export function LaunchTokenModal({
  theme,
  tokenInput,
  error,
  isValidating,
  onClose,
  onTokenChange,
  onSubmit,
}: LaunchTokenModalProps) {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modal}
        data-theme={theme}
        onClick={(e) => { e.stopPropagation(); }}
      >
        <button className={styles.modalClose} onClick={onClose} aria-label="Close">
          ✕
        </button>
        <p className={styles.modalTitle}>Enter your invitation code</p>
        <p className={styles.modalSubtitle}>Paste the code from your invitation card</p>
        <form onSubmit={onSubmit} className={styles.tokenForm}>
          <input
            type="text"
            className={styles.tokenInput}
            placeholder="Your code"
            value={tokenInput}
            onChange={(e) => { onTokenChange(e.target.value); }}
            autoFocus
            disabled={isValidating}
            autoComplete="off"
          />
          {error !== null && <p className={styles.errorMessage}>{error}</p>}
          <button
            type="submit"
            className={styles.cta}
            disabled={tokenInput.trim().length === 0 || isValidating}
          >
            {isValidating ? '···' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
