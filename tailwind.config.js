/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#fafafa',
        card: '#ffffff',
        'card-hover': '#f5f5f5',
        border: '#e8e8e8',
        'border-light': '#f0f0f0',
        text: '#0d0e0e',
        'text-secondary': '#666666',
        'text-tertiary': '#999999',
        accent: '#0d0e0e',
        'accent-light': '#2a2a2a',
        'accent-bg': 'rgba(13, 14, 14, 0.05)',
        success: '#1db954',
        warning: '#d4a026',
        error: '#e53e3e',
        'score-green': '#1db954',
        'score-orange': '#d4a026',
        'score-red': '#e53e3e',
        'wes': '#1E3A5F',
        'gibb': '#7c3aed',
      },
      fontFamily: {
        sans: ['Geist Sans', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '12px',
        sm: '8px',
        lg: '16px',
        xl: '20px',
        full: '9999px',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(0,0,0,0.04)',
        DEFAULT: '0 2px 8px rgba(0,0,0,0.06)',
        lg: '0 8px 24px rgba(0,0,0,0.08)',
        xl: '0 16px 40px rgba(0,0,0,0.1)',
      },
      letterSpacing: {
        tight: '-0.025em',
      },
    },
  },
  plugins: [],
};
