/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6',
        secondary: '#10b981',
        accent: '#2563eb',
        error: '#ef4444',
        success: '#22c55e',
        border: '#e5e7eb',
        textPrimary: '#111827',
        textSecondary: '#6b7280',
      },
    },
  },
  plugins: [],
};