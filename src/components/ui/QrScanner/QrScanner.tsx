// QrScanner — Full-screen camera overlay for scanning QR codes using html5-qrcode
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import styles from './QrScanner.module.css';
import type { QrScannerProps } from './QrScanner.types';

const SCANNER_ID = 'qr-scanner-viewport';

export default function QrScanner({ onScan, onClose }: QrScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasScannedRef = useRef(false);

  // Handle successful scan
  const handleScan = useCallback(
    (decodedText: string) => {
      if (hasScannedRef.current) return;
      hasScannedRef.current = true;

      // Stop scanner before navigating
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
      onScan(decodedText);
    },
    [onScan]
  );

  // Initialize and cleanup scanner
  useEffect(() => {
    const scanner = new Html5Qrcode(SCANNER_ID);
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        handleScan,
        () => {} // Ignore non-QR scan attempts
      )
      .catch(() => {
        setError(
          'Camera access denied. Please allow camera permissions and try again.'
        );
      });

    return () => {
      scanner.stop().catch(() => {});
    };
  }, [handleScan]);

  // Close handler — stop scanner first
  const handleClose = useCallback(() => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
    }
    onClose();
  }, [onClose]);

  return (
    <div className={styles.overlay}>
      <button
        className={styles.closeButton}
        onClick={handleClose}
        aria-label="Close scanner"
      >
        ✕
      </button>

      <div className={styles.scannerContainer}>
        <div id={SCANNER_ID} />
      </div>

      {error ? (
        <p className={styles.error}>{error}</p>
      ) : (
        <p className={styles.instruction}>
          Scan your invitation
        </p>
      )}
    </div>
  );
}
