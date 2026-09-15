/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#f7f6f3',
        surface: '#ffffff',
        sidebar: '#f1f0ec',
        hover: '#ecebe6',
        line: '#e6e4de',
        'line-strong': '#d3d0c8',
        ink: { DEFAULT: '#1d1c1a', 2: '#57534e', 3: '#8b867e' },
        accent: { DEFAULT: '#1f6f5c', hover: '#185b4b', soft: '#e6f0ec' },
        danger: { DEFAULT: '#b42318', soft: '#fdecea' },
        /** Bar fill for charts — validated for chroma and contrast on white. */
        chart: '#15876a',
        p1: '#d0342c',
        p2: '#c26a00',
        p3: '#2f6bd8',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['11px', '16px'],
      },
      boxShadow: {
        pop: '0 12px 32px -8px rgba(29, 28, 26, 0.18), 0 2px 6px rgba(29, 28, 26, 0.06)',
      },
    },
  },
  plugins: [],
};
