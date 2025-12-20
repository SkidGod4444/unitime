/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "media",
  theme: {
    extend: {
      colors: {
        primary: "#1D4ED8",
        'primary-dark': "#1E40AF",
        'primary-light': "#3B82F6",
        secondary: "#27272A",
        background: "#F9FAFB",
        dark: "#121214",
        'dark-accent': "#18181B",
        accent: "#A1A1AA",
        'blue-50': '#EFF6FF',
        'blue-100': '#DBEAFE',
        'blue-600': '#2563EB',
        'blue-700': '#1D4ED8',
        'blue-800': '#1E40AF',
        'blue-900': '#1E3A8A',
      },
      fontFamily: {
        'lora': ['Lora-Regular', 'Lora-Bold', 'Lora-Italic', 'Lora-BoldItalic', 'Lora-Medium', 'Lora-MediumItalic', 'Lora-SemiBold', 'Lora-SemiBoldItalic'],
      },
    },
  },
  plugins: [],
  compilerOptions: {
    strict: true,
    paths: {
      "@/*": ["./*"],
    },
  },
}