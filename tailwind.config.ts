// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}', // This single line correctly scans all files in the src directory
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          '50': '#f5fafc',
          '100': '#eaf6fa',
          '200': '#d0ecf5',
          '300': '#a6d9e9',
          '400': '#72bfda',
          '500': '#49a4ca',
          '600': '#338ab8',
          '700': '#0277b6', // Your brand color
          '800': '#026092',
          '900': '#01496e',
          '950': '#01324d',
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
export default config
