/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /** Behind the rounded app shell (desktop). */
        page: '#e6e6e6',
        canvas: '#f4f4f4',
        surface: '#ffffff',
        sidebar: '#f4f4f4',
        hover: '#ececec',
        line: '#ebebeb',
        'line-strong': '#dcdcdc',
        ink: { DEFAULT: '#1c1c1c', 2: '#6e6e6e', 3: '#a3a3a3' },
        accent: { DEFAULT: '#1a7f53', hover: '#146842', soft: '#e6f5ec' },
        danger: { DEFAULT: '#c0362c', soft: '#fdecea' },
        /** Single-series chart fill — validated for lightness, chroma and 3:1 contrast on white. */
        chart: '#30a46c',
        /** Pastel count badges. */
        'badge-orange': { DEFAULT: '#fcd3bd', ink: '#4a230f' },
        'badge-green': { DEFAULT: '#c9ecd6', ink: '#123b24' },
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
      borderRadius: {
        card: '26px',
        shell: '32px',
      },
      boxShadow: {
        pop: '0 20px 48px -12px rgba(0, 0, 0, 0.22), 0 2px 6px rgba(0, 0, 0, 0.05)',
        card: '0 1px 1px rgba(0, 0, 0, 0.02), 0 8px 24px -10px rgba(0, 0, 0, 0.09)',
        pill: '0 1px 2px rgba(0, 0, 0, 0.06), 0 4px 14px -6px rgba(0, 0, 0, 0.12)',
      },
    },
  },
  plugins: [],
};
