/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Verus Official Brand Colors - From Official Media Assets
      colors: {
        verus: {
          // Primary Brand Color - Verus Blue (Main usage)
          blue: '#3165d4', // Official Verus Blue - primary actions, links, emphasis
          'blue-light': '#4a7ce8', // Lighter blue for hover states
          'blue-dark': '#2650b3', // Darker blue for pressed states

          // Official Additional Palette
          green: '#4AA658', // Official Verus Green - success states, positive metrics
          'green-light': '#5cb96a', // Lighter green for hover
          'green-dark': '#3d8a49', // Darker green for active states

          red: '#D4313E', // Official Verus Red - error states, alerts
          'red-light': '#e04b56', // Lighter red for hover
          'red-dark': '#b52732', // Darker red for active states

          // Official Text Palette
          'text-dark': '#1C1C1C', // Official dark text
          'text-grey': '#959595', // Official dark grey text
          'text-light-grey': '#D6D6D6', // Official light grey text

          // Neutral Backgrounds
          dark: '#0a0e1a', // Primary dark background
          'dark-secondary': '#141b2d', // Secondary dark background
          'dark-tertiary': '#1a2332', // Tertiary dark (cards, panels)

          // Semantic Colors (using official palette only)
          success: '#4AA658', // Success (official green)
          warning: '#f59e0b', // Warning (amber - no official alternative)
          error: '#D4313E', // Error (official red)
          info: '#3165d4', // Info (uses official blue)
        },

        // Override default Tailwind colors to use Verus palette
        primary: {
          DEFAULT: '#3165d4',
          50: '#eff4ff',
          100: '#dbe7fe',
          200: '#bfd4fe',
          300: '#93b5fd',
          400: '#4a7ce8',
          500: '#3165d4',
          600: '#2650b3',
          700: '#1e3f8f',
          800: '#1e3576',
          900: '#1d2f62',
        },
        secondary: {
          DEFAULT: '#4AA658',
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#5cb96a',
          500: '#4AA658',
          600: '#3d8a49',
          700: '#2f6d39',
          800: '#235730',
          900: '#1a4726',
        },
        accent: {
          DEFAULT: '#D4313E',
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#e04b56',
          500: '#D4313E',
          600: '#b52732',
          700: '#991b1b',
          800: '#7f1d1d',
          900: '#641e1e',
        },
      },

      // Standardized breakpoints for consistent responsive design
      screens: {
        xs: '375px', // Small phones
        sm: '640px', // Large phones (Tailwind default)
        md: '768px', // Tablets (Tailwind default)
        lg: '1024px', // Laptops (Tailwind default)
        xl: '1280px', // Desktops (Tailwind default)
        '2xl': '1536px', // Large desktops (Tailwind default)
      },

      // Standardized spacing scale (4px base unit)
      spacing: {
        0: '0',
        1: '0.25rem', // 4px
        2: '0.5rem', // 8px
        3: '0.75rem', // 12px
        4: '1rem', // 16px - Base unit
        5: '1.25rem', // 20px
        6: '1.5rem', // 24px
        7: '1.75rem', // 28px
        8: '2rem', // 32px
        9: '2.25rem', // 36px
        10: '2.5rem', // 40px
        11: '2.75rem', // 44px - Min touch target
        12: '3rem', // 48px - Recommended touch target
        14: '3.5rem', // 56px
        16: '4rem', // 64px
        20: '5rem', // 80px
        24: '6rem', // 96px
        28: '7rem', // 112px
        32: '8rem', // 128px
        36: '9rem', // 144px
        40: '10rem', // 160px
        44: '11rem', // 176px
        48: '12rem', // 192px
        52: '13rem', // 208px
        56: '14rem', // 224px
        60: '15rem', // 240px
        64: '16rem', // 256px
        72: '18rem', // 288px
        80: '20rem', // 320px
        96: '24rem', // 384px
      },

      // Typography scale - Optimized for Poppins
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1.1rem' }], // 12px
        sm: ['0.875rem', { lineHeight: '1.3rem' }], // 14px
        base: ['1rem', { lineHeight: '1.6rem' }], // 16px
        lg: ['1.125rem', { lineHeight: '1.8rem' }], // 18px
        xl: ['1.25rem', { lineHeight: '1.8rem' }], // 20px
        '2xl': ['1.5rem', { lineHeight: '2.1rem' }], // 24px
        '3xl': ['1.875rem', { lineHeight: '2.3rem' }], // 30px
        '4xl': ['2.25rem', { lineHeight: '2.6rem' }], // 36px
        '5xl': ['3rem', { lineHeight: '1.1' }], // 48px
        '6xl': ['3.75rem', { lineHeight: '1.1' }], // 60px
        '7xl': ['4.5rem', { lineHeight: '1.1' }], // 72px
      },

      // Font family configuration
      fontFamily: {
        sans: [
          'Poppins',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Oxygen',
          'Ubuntu',
          'Cantarell',
          'Fira Sans',
          'Droid Sans',
          'Helvetica Neue',
          'sans-serif',
        ],
      },

      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },

      // Animation durations
      transitionDuration: {
        0: '0ms',
        75: '75ms',
        100: '100ms',
        150: '150ms',
        200: '200ms',
        300: '300ms',
        500: '500ms',
        700: '700ms',
        1000: '1000ms',
      },

      // Z-index scale
      zIndex: {
        0: '0',
        10: '10',
        20: '20',
        30: '30',
        40: '40',
        50: '50',
        auto: 'auto',
      },
    },
  },
  plugins: [],
};
