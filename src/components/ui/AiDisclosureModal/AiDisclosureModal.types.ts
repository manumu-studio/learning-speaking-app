// AiDisclosureModal prop types

export interface AiDisclosureModalProps {
  /** Called when the user accepts the disclosure (or, in infoOnly mode, dismisses) */
  onAccept: () => void;
  /**
   * When true, renders in read-only info mode.
   * The accept button reads "Got it" and the intro text changes to informational tone.
   */
  infoOnly?: boolean | undefined;
}
