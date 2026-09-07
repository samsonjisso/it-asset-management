/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Inter (self-hosted variable font, loaded in main.tsx) is the
        // app-wide typeface — modern, professional, and designed for
        // small UI text, so it reads consistently across dashboard
        // stats, dense tables, form labels, and nav alike. The original
        // system-font stack is kept as the fallback chain in case the
        // webfont fails to load.
        sans: [
          'Inter Variable',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
      colors: {
        // Goh Betoch Bank corporate blue-black — built from the same hue as
        // the GBB logo mark across the full 50–950 range, so every
        // component that references brand-50..950 (buttons, links, focus
        // rings, badges) renders in the real on-brand navy instead of a
        // generic bright blue. brand-600 is #3835A3.
        brand: {
          50: '#F2F2F9',
          100: '#E5E5F3',
          200: '#CCCBE7',
          300: '#A8A7D7',
          400: '#7E7CC4',
          500: '#5552B0',
          600: '#3835A3',
          700: '#2F2D8A',
          800: '#232267',
          900: '#191748',
          950: '#101030',
        },
        // Same scale kept under its own name for any spot that intentionally
        // reaches for the navy alias rather than the brand token — flattened
        // to a single flat #3835A3 (no more per-step gradient shades) so
        // every navy-900/800/700/600 gradient, header, footer, and button
        // renders as one solid brand color.
        navy: {
          950: '#3835A3',
          900: '#3835A3',
          800: '#3835A3',
          700: '#3835A3',
          600: '#3835A3',
        },
        // Repurposed as Jira's accent/warning yellow-orange (used for the
        // "gold"-variant buttons and highlight chips).
        gold: {
          50: '#FFFAE6',
          100: '#FFF0B3',
          200: '#FFE380',
          300: '#FFC400',
          400: '#FFAB00',
          500: '#FF991F',
          600: '#E56910',
          700: '#B65C02',
          800: '#974F0C',
        },
        // Atlassian neutral gray scale used for chrome/backgrounds.
        neutral: {
          0: '#FFFFFF',
          10: '#FAFBFC',
          20: '#F4F5F7',
          30: '#EBECF0',
          40: '#DFE1E6',
          50: '#C1C7D0',
          60: '#B3BAC5',
          70: '#A5ADBA',
          80: '#97A0AF',
          90: '#8993A4',
          100: '#7A869A',
          200: '#6B778C',
          300: '#5E6C84',
          400: '#42526E',
          500: '#344563',
          600: '#253858',
          700: '#172B4D',
          800: '#091E42',
        },
      },
      boxShadow: {
        soft: '0 1px 1px rgba(9, 30, 66, 0.25), 0 0 1px 1px rgba(9, 30, 66, 0.13)',
        card: '0 1px 1px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)',
        lift: '0 4px 8px -2px rgba(9, 30, 66, 0.25), 0 0 1px rgba(9, 30, 66, 0.31)',
        glow: '0 0 0 2px rgba(50, 47, 147, 0.3)',
      },
      borderRadius: {
        // Jira/Atlassian uses much tighter corner radii than the default
        // rounded-xl/2xl the app was built with — scale everything down so
        // every existing rounded-xl / rounded-2xl className renders "Jira flat".
        none: '0px',
        sm: '3px',
        DEFAULT: '3px',
        md: '3px',
        lg: '4px',
        xl: '6px',
        '2xl': '8px',
        '3xl': '10px',
        full: '9999px',
      },
      keyframes: {
        'scale-in': {
          from: { opacity: 0, transform: 'scale(0.96) translateY(4px)' },
          to: { opacity: 1, transform: 'scale(1) translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
      },
      animation: {
        'scale-in': 'scale-in 0.18s ease-out',
        shimmer: 'shimmer 1.6s linear infinite',
      },
    },
  },
  plugins: [],
};
