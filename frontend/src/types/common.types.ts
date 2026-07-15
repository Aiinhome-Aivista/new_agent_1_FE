export type Theme = 'light' | 'dark' | 'system';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  active?: boolean;
}

export interface NavItem {
  title: string;
  href: string;
  icon: string;
  disabled?: boolean;
}
