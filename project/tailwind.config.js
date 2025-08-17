/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: { // Gold
          DEFAULT: "hsl(44, 92%, 42%)", // #ca9b0f
          content: "hsl(0, 0%, 10%)",   // Off-black for text on gold
          hover: "hsl(44, 92%, 35%)",   // Darker gold
        },
        accent: { // Off-black
          DEFAULT: "hsl(0, 0%, 10%)",   // #1a1a1a (darker than #020202 for better feel)
          content: "hsl(0, 0%, 95%)",   // Off-white for text on black
          hover: "hsl(0, 0%, 20%)",    // Lighter off-black / dark gray
        },
        secondary: { // Grays for general text, borders, subtle UI elements
          light: "hsl(210, 15%, 65%)", 
          DEFAULT: "hsl(210, 15%, 45%)", 
          dark: "hsl(210, 15%, 25%)",  
        },
        background: {
          DEFAULT: "hsl(0, 0%, 100%)",    // White
          alt: "hsl(210, 20%, 95%)",   // Very Light Gray
        },
        danger: { // For delete/cancel buttons - kept from previous
          DEFAULT: "hsl(0, 72%, 51%)", 
          hover: "hsl(0, 75%, 45%)", 
          content: "hsl(0, 0%, 100%)", 
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        'lg': '8px', 
      }
    },
  },
  plugins: [],
}
