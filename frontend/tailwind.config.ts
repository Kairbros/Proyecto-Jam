import type { Config } from 'tailwindcss'

const coral = {
  50:  '#fff1f1',
  100: '#ffe0e0',
  200: '#ffc6c6',
  300: '#ff9d9d',
  400: '#ff7373',
  500: '#fa5c5c',
  600: '#ec4848',
  700: '#c93838',
  800: '#a32f2f',
  900: '#7e2828',
  950: '#451111',
}

const pink = {
  50:  '#fff1f4',
  100: '#ffe0e6',
  200: '#ffc6d2',
  300: '#ff9db1',
  400: '#ff6f8c',
  500: '#fb556f',
  600: '#ec4860',
  700: '#c93850',
  800: '#a32f43',
  900: '#7e283a',
  950: '#45111c',
}

const neutral = {
  50:  '#fafafa',
  100: '#f4f4f5',
  200: '#e4e4e7',
  300: '#d4d4d8',
  400: '#a1a1aa',
  500: '#71717a',
  600: '#52525b',
  700: '#3f3f46',
  800: '#27272a',
  900: '#18181b',
  950: '#0e0e10',
}

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        violet: coral,
        fuchsia: pink,
        gray: neutral,
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: {
        none: '0',
        sm:   '0',
        DEFAULT: '0',
        md:   '0',
        lg:   '0',
        xl:   '0',
        '2xl': '0',
        '3xl': '0',
        full: '9999px',
      }
    }
  },
  plugins: []
}

export default config
