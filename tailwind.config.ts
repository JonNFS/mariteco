import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        pink: {
          50: '#FFF0F6', 100: '#FFE0EC', 200: '#FFC2D9', 300: '#FF9DC0', 400: '#FF77A9',
          500: '#F2528F', 600: '#D63A78', 700: '#B02A60',
        },
        sky: {
          50: '#EFF8FF', 100: '#DCF0FF', 200: '#B9E1FF', 300: '#8ACDFF', 400: '#55B4F7',
          500: '#2F98E8', 600: '#1F7BC4', 700: '#195F9A',
        },
        ink: { 900: '#25244A', 800: '#2F2E5E', 700: '#3C3B6E', 500: '#6B6A99', 300: '#A9A8CC', 100: '#E9E8F5' },
        cream: '#FFFBF7',
        sun: { 100: '#FFF1C7', 300: '#FFD66B', 500: '#F7B928' },
        mint: { 100: '#DDF6E8', 300: '#9FE3BF', 500: '#35B97A' },
      },
      fontFamily: {
        display: ['"Fredoka Variable"', 'ui-rounded', 'system-ui', 'sans-serif'],
        sans: ['"Nunito Variable"', 'ui-rounded', 'system-ui', 'sans-serif'],
      },
      borderRadius: { '4xl': '2rem', '5xl': '2.5rem' },
      boxShadow: {
        candy: '0 10px 0 -2px rgba(242,82,143,.18), 0 18px 30px -10px rgba(242,82,143,.35)',
        soft: '0 12px 40px -12px rgba(37,36,74,.18)',
        pop: '0 14px 30px -10px rgba(47,152,232,.45)',
      },
      keyframes: {
        float: { '0%,100%': { transform: 'translateY(0) rotate(0deg)' }, '50%': { transform: 'translateY(-14px) rotate(3deg)' } },
        floatSlow: { '0%,100%': { transform: 'translate(0,0) scale(1)' }, '50%': { transform: 'translate(18px,-12px) scale(1.06)' } },
        wiggle: { '0%,100%': { transform: 'rotate(0)' }, '25%': { transform: 'rotate(-6deg)' }, '75%': { transform: 'rotate(6deg)' } },
        marquee: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
        pop: { '0%': { transform: 'scale(.9)', opacity: '0' }, '60%': { transform: 'scale(1.04)' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        rise: { from: { opacity: '0', transform: 'translateY(18px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        pulseRing: { '0%': { boxShadow: '0 0 0 0 rgba(37,211,102,.55)' }, '100%': { boxShadow: '0 0 0 18px rgba(37,211,102,0)' } },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        floatSlow: 'floatSlow 11s ease-in-out infinite',
        wiggle: 'wiggle .6s ease-in-out',
        marquee: 'marquee 32s linear infinite',
        pop: 'pop .45s cubic-bezier(.34,1.56,.64,1) both',
        rise: 'rise .6s ease-out both',
        pulseRing: 'pulseRing 2s ease-out infinite',
      },
    },
  },
  plugins: [],
};
export default config;
