import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                dark: '#030014',
                primary: '#8b5cf6',
                accent: '#06b6d4',
                muted: '#94a3b8',
                paper: '#EDF1ED',
                writing: '#FFFEFA',
                ink: '#193E35',
                'ink-muted': '#52685F',
                rust: '#B34D39',
                rule: '#C9D3CA',
                selection: '#E1E9E1'
            },
            fontFamily: {
                sans: ['var(--font-outfit)', 'sans-serif'],
                display: ['var(--font-space-grotesk)', 'sans-serif'],
                margin: ['var(--font-dm-sans)', 'Arial', 'sans-serif'],
                'margin-mono': ['var(--font-plex-mono)', 'monospace'],
            },
            backgroundImage: {
                "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
                "gradient-conic":
                    "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
            },
        },
    },
    plugins: [],
};
export default config;
