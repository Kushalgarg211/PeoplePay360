/** @type {import('tailwindcss').Config} */

const fourColors = {
  50: '#f5eef7',
  100: '#f5eef7',
  200: '#bc9ace',
  300: '#bc9ace',
  400: '#bc9ace',
  500: '#64327a',
  600: '#64327a',
  700: '#3a1160',
  800: '#3a1160',
  900: '#3a1160',
  950: '#3a1160',
};

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      white: '#f5eef7',
      black: '#3a1160',
      slate: fourColors,
      gray: fourColors,
      zinc: fourColors,
      neutral: fourColors,
      stone: fourColors,
      red: fourColors,
      orange: fourColors,
      amber: fourColors,
      yellow: fourColors,
      lime: fourColors,
      green: fourColors,
      emerald: fourColors,
      teal: fourColors,
      cyan: fourColors,
      sky: fourColors,
      blue: fourColors,
      indigo: fourColors,
      violet: fourColors,
      purple: fourColors,
      fuchsia: fourColors,
      pink: fourColors,
      rose: fourColors,
      primary: fourColors,
    },
    extend: {
      fontFamily: {
        sans: ['"Open Sans"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.375rem',
        sm: '0.25rem',
        md: '0.375rem',
        lg: '0.5rem',
        xl: '0.625rem',
        '2xl': '0.75rem',
        '3xl': '1rem',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0,0,0,0.07), 0 1px 2px -1px rgba(0,0,0,0.06)',
        'card-hover': '0 4px 12px 0 rgba(0,0,0,0.10), 0 2px 4px -2px rgba(0,0,0,0.08)',
        dropdown: '0 8px 24px -4px rgba(0,0,0,0.14), 0 2px 6px -2px rgba(0,0,0,0.08)',
        modal: '0 20px 60px -10px rgba(0,0,0,0.25)',
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.2s ease-out',
        'scale-in': 'scaleIn 0.18s ease-out',
        'slide-in-right': 'slideInRight 0.25s ease-out',
      },
      keyframes: {
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.97)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
