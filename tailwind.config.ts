import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        heading: ["var(--font-heading)", "var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"]
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))"
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))"
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))"
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))"
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))"
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))"
        },
        // 新デザイントークン(hex 直接参照)
        paper: "var(--paper)",
        panel: {
          DEFAULT: "var(--panel)",
          2: "var(--panel-2)"
        },
        ink: "var(--ink)",
        slate: {
          DEFAULT: "var(--slate)",
          light: "var(--slate-light)"
        },
        // アクセント(スタンプの赤)。--aqua* は旧名の後方互換エイリアス。
        stamp: {
          DEFAULT: "var(--stamp)",
          deep: "var(--stamp-deep)"
        },
        aqua: {
          DEFAULT: "var(--aqua)",
          deep: "var(--aqua-deep)"
        },
        board: {
          DEFAULT: "var(--board)",
          deep: "var(--board-deep)",
          ink: "var(--board-ink)",
          sub: "var(--board-sub)"
        },
        wood: {
          DEFAULT: "var(--wood)",
          light: "var(--wood-light)",
          dark: "var(--wood-dark)",
          deep: "var(--wood-deep)",
          shadow: "var(--wood-shadow)"
        },
        kraft: {
          DEFAULT: "var(--kraft)",
          ink: "var(--kraft-ink)"
        },
        rule: "var(--rule)",
        hover: "var(--hover)",
        signal: "var(--signal)",
        error: "var(--error)"
      },
      borderRadius: {
        none: "0px",
        sm: "2px",
        DEFAULT: "3px",
        md: "3px",
        lg: "var(--radius)",
        xl: "var(--radius)",
        "2xl": "var(--radius)",
        "3xl": "var(--radius)",
        full: "9999px"
      },
      // 汎用の shadow-sm / shadow-lg などは無効のまま(罫線で表現する方針を維持)。
      // 什器・棚板・ジャケットなど「物」の厚みだけ、名前付きの影として許可する。
      boxShadow: {
        none: "none",
        sm: "none",
        DEFAULT: "none",
        md: "none",
        lg: "none",
        xl: "none",
        "2xl": "none",
        inner: "none",
        // 什器の持ち上がり(全カード共通)
        lift: "0 2px 0 #d8c8b0",
        // 押せるボタンの厚み
        press: "0 2px 0 var(--stamp-deep)",
        "press-board": "0 2px 0 var(--board-deep)",
        // 黒板パネル
        board: "0 2px 0 var(--board-deep), 0 16px 30px -14px rgba(22,33,43,.45)",
        // CDケース
        jacket:
          "inset 0 1px 0 rgba(255,255,255,.7), 0 2px 4px rgba(22,33,43,.16), 0 14px 26px -12px rgba(22,33,43,.30)",
        // 背表紙(右端に厚みの陰)
        spine: "inset -3px 0 6px rgba(0,0,0,.22), 0 2px 4px rgba(22,33,43,.2)",
        // 棚の内側の影(バックナンバー棚)
        crate: "inset 0 2px 8px rgba(122,88,55,.18)",
        // 入荷ベルのモーダル
        modal: "0 20px 40px -16px rgba(22,33,43,.5)"
      }
    }
  },
  plugins: []
};

export default config;
