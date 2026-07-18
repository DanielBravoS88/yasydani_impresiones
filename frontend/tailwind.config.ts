import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          pink:   '#ff77c8',
          pink2:  '#ffd6ec',
          hot:    '#ff4fd8',
          aqua:   '#58ded8',
          aqua2:  '#c8fbf5',
          lav:    '#d8c7ff',
          cream:  '#fff7df',
          text:   '#51344d',
        },
      },
      fontFamily: {
        pacifico:  ['Pacifico', 'cursive'],
        quicksand: ['Quicksand', 'sans-serif'],
        baloo:     ['"Baloo 2"', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        brand:  '0 18px 40px rgba(255,79,170,.18)',
        card:   '0 8px 24px rgba(255,119,200,.15)',
        float:  '0 10px 25px rgba(255,79,216,.28)',
      },
      backgroundImage: {
        'brand-gradient':  'linear-gradient(135deg, #fff1fa, #dcfffb 45%, #fff8df)',
        'hero-gradient':   'linear-gradient(135deg, #80f1df, #ffcae8 60%, #fff7ad)',
        'topbar-gradient': 'linear-gradient(90deg, #ff77c8, #58ded8, #fff28b, #ff77c8)',
      },
    },
  },
  plugins: [],
};

export default config;
