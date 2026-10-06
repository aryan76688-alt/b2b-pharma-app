import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#F5F8FC",
        foreground: "#0F172A",
        shreeji: {
          blue: "#1268E8",
          darkBlue: "#073B8C",
          green: "#12A86B",
          darkGreen: "#0B6E45",
          red: "#E72B35",
          bg: "#F5F8FC",
          card: "#FFFFFF",
          border: "#E2E8F0",
        },
        owner: {
          primary: "#1268E8",
          hover: "#073B8C",
          surface: "#EFF6FF",
          border: "#BFDBFE",
          badge: "#DBEAFE",
        },
        salesman: {
          primary: "#12A86B",
          hover: "#0B6E45",
          surface: "#F0FDF4",
          border: "#BBF7D0",
          badge: "#DCFCE7",
        }
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.25rem",
      },
      boxShadow: {
        soft: "0 2px 10px -2px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.03)",
        card: "0 4px 16px -2px rgba(18, 104, 232, 0.06), 0 2px 6px -2px rgba(0, 0, 0, 0.04)",
      }
    },
  },
  plugins: [],
};

export default config;
