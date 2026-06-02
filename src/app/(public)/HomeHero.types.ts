// Types for the HomeHero landing page hero section component

export interface HomeHeroProps {
  isAuthenticated: boolean;
  error: string | undefined;
  signInAction: () => Promise<void>;
}
