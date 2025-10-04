// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}', // This single line correctly scans all files in the src directory
  ],
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
export default config
