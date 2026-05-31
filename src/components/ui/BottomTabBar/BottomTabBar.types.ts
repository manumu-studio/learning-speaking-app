// Bottom tab bar prop and item types
export interface BottomTabBarProps {
  onMorePress: () => void;
}

export interface TabItem {
  href: string;
  label: string;
  icon: 'mic' | 'chart' | 'clock' | 'dots';
}
