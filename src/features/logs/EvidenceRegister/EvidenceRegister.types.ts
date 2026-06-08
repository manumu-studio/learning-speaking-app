// Props for the EvidenceRegister component
import type { EvidenceBundle } from '@/lib/evidence';

export interface EvidenceRegisterProps {
  bundle: EvidenceBundle;
  title: string;
  subtitle: string;
  backHref: string;
}
