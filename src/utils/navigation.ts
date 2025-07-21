// Navigation utilities for smooth scrolling and active section detection
import React from 'react';

export const smoothScrollTo = (elementId: string, offset: number = 80) => {
  const element = document.getElementById(elementId.replace('#', ''));
  if (element) {
    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - offset;

    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    });
  }
};

export const getActiveSection = (sections: string[]): string => {
  const scrollPosition = window.scrollY + 100; // Offset for header height

  for (let i = sections.length - 1; i >= 0; i--) {
    const section = document.getElementById(sections[i].replace('#', ''));
    if (section && section.offsetTop <= scrollPosition) {
      return sections[i];
    }
  }

  return sections[0] || '';
};

export const useActiveSection = (sections: string[]) => {
  const [activeSection, setActiveSection] = React.useState<string>('');

  React.useEffect(() => {
    const handleScroll = () => {
      const active = getActiveSection(sections);
      setActiveSection(active);
    };

    // Set initial active section
    handleScroll();

    // Add scroll listener
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [sections]);

  return activeSection;
};

// Navigation items configuration
export const navigationConfig = {
  main: [
    { label: 'Features', href: '#features', id: 'features' },
    { label: 'Pricing', href: '#pricing', id: 'pricing' },
    { label: 'Resources', href: '/resources', id: 'resources', external: true },
    { label: 'Support', href: '/support', id: 'support', external: true },
  ],
  cta: {
    primary: {
      label: 'Start Free Trial',
      href: '/auth/auth1/register',
    },
    secondary: {
      label: 'Request Demo',
      href: '/demo',
    },
    login: {
      label: 'Login',
      href: '/auth/auth1/login',
    },
  },
};

// Mobile navigation configuration
export const mobileNavigationConfig = {
  ...navigationConfig,
  additional: [
    { label: 'About', href: '/about', external: true },
    { label: 'Blog', href: '/blog', external: true },
    { label: 'Contact', href: '/contact', external: true },
  ],
};