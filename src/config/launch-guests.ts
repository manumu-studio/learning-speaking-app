// Launch event guest configuration — maps unique QR tokens to guest identities

// Guest entry type
interface LaunchGuest {
  name: string;
  slug: string; // URL-safe lowercase version of name
}

// Token → Guest mapping (5 guests)
// Tokens are pre-generated cryptographically random base64url strings
const LAUNCH_GUESTS: Record<string, LaunchGuest> = {
  'X7kP9mQwRtY2sVnL4hJ8dF': { name: 'Sandra', slug: 'sandra' },
  'M3bN5xC1pK8qW2vT4zL9rA': { name: 'Umut', slug: 'umut' },
  'J6fH2yD8sE4nU7wG1iO5kR': { name: 'Gabrielle', slug: 'gabrielle' },
  'Q9tV3aP7lB6mX1cZ8jW5nY': { name: 'Guest Four', slug: 'guest-four' },
  'R4uI8eK2gS6hL3oF7dN9wM': { name: 'Guest Five', slug: 'guest-five' },
} as const satisfies Record<string, LaunchGuest>;

// Validate a token and return guest data if valid
function validateToken(token: string): LaunchGuest | null {
  return LAUNCH_GUESTS[token] ?? null;
}

// Get all valid tokens (for QR code generation)
function getAllTokens(): string[] {
  return Object.keys(LAUNCH_GUESTS);
}

export { validateToken, getAllTokens, LAUNCH_GUESTS };
export type { LaunchGuest };
