import { ImageResponse } from "next/og";

import { siteUrl } from "@/lib/site-url";

export const OG_SIZE = { width: 1200, height: 630 };

const FONT_FAMILY = "Noto Sans JP";
const FONT_FETCH_TIMEOUT_MS = 5_000;

// globals.css のカラートークンと同じ値。OGP画像はTailwindを使えないため直接指定する。
const COLORS = {
  background: "#ede6db", // paper
  foreground: "#16212b", // ink
  muted: "#5c4b38", // slate
  primary: "#a32a22", // stamp
  primaryDark: "#71190f", // stamp-deep
  board: "#1d2a24",
  wood: "#a97f52",
  woodShadow: "#6a4a2e"
};

// public/logo-mark.svg と同じ図形(Satori で描画するため data URI で埋め込む)。
const LOGO_MARK_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#1d2a24"/><circle cx="38" cy="31" r="14" fill="#e3ebed"/><circle cx="38" cy="31" r="5.5" fill="none" stroke="#b9c9ce" stroke-width="1"/><circle cx="38" cy="31" r="2.3" fill="#1d2a24"/><rect x="11" y="15" width="30" height="34" rx="1.2" fill="#a32a22"/><rect x="11" y="15" width="7" height="34" fill="#e4d4bc"/><rect x="7" y="49" width="50" height="5" rx="1" fill="#a97f52"/><rect x="7" y="53" width="50" height="1.6" fill="#6a4a2e"/></svg>';
const LOGO_MARK_SRC = `data:image/svg+xml;base64,${Buffer.from(LOGO_MARK_SVG).toString("base64")}`;

async function loadGoogleFontSubset(weight: 400 | 700, text: string) {
  const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(FONT_FAMILY)}:wght@${weight}&text=${encodeURIComponent(text)}`;
  const css = await (
    await fetch(url, { signal: AbortSignal.timeout(FONT_FETCH_TIMEOUT_MS) })
  ).text();

  const resource = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/);

  if (!resource) {
    throw new Error("Font resource not found in Google Fonts CSS");
  }

  const response = await fetch(resource[1], { signal: AbortSignal.timeout(FONT_FETCH_TIMEOUT_MS) });

  if (!response.ok) {
    throw new Error(`Failed to fetch font: ${response.status}`);
  }

  return response.arrayBuffer();
}

async function loadFonts(text: string) {
  const uniqueChars = Array.from(new Set(text)).join("");

  try {
    const [regular, bold] = await Promise.all([
      loadGoogleFontSubset(400, uniqueChars),
      loadGoogleFontSubset(700, uniqueChars)
    ]);

    return [
      { name: FONT_FAMILY, data: regular, weight: 400 as const, style: "normal" as const },
      { name: FONT_FAMILY, data: bold, weight: 700 as const, style: "normal" as const }
    ];
  } catch (error) {
    // フォント取得に失敗しても画像自体は返す（英数字はデフォルトフォントで描画される）
    console.error("OG image font loading failed", error);
    return undefined;
  }
}

export function truncateForOg(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

export async function createBrandOgImage({
  label,
  title,
  subtitle,
  stat
}: {
  label: string;
  title: string;
  subtitle?: string;
  stat?: string;
}) {
  const hostname = new URL(siteUrl).hostname;
  const fonts = await loadFonts(["おとあつめ", label, title, subtitle ?? "", stat ?? "", hostname].join(""));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: COLORS.background,
          backgroundImage: `radial-gradient(circle at top left, ${COLORS.primary}1f, transparent 60%)`,
          color: COLORS.foreground,
          fontFamily: `"${FONT_FAMILY}", sans-serif`,
          padding: "56px 72px",
          position: "relative"
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 1200,
            height: 16,
            display: "flex",
            backgroundColor: COLORS.wood,
            borderBottom: `4px solid ${COLORS.woodShadow}`
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <img src={LOGO_MARK_SRC} width={56} height={56} alt="" />
          <div style={{ fontSize: 36, fontWeight: 700, color: COLORS.board, letterSpacing: 2 }}>おとあつめ</div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flexGrow: 1,
            justifyContent: "center"
          }}
        >
          <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: 8, color: COLORS.primaryDark }}>
            {label}
          </div>
          <div
            style={{
              marginTop: 18,
              fontSize: 62,
              fontWeight: 700,
              lineHeight: 1.3
            }}
          >
            {truncateForOg(title, 44)}
          </div>
          {subtitle ? (
            <div style={{ marginTop: 18, fontSize: 34, color: COLORS.muted }}>
              {truncateForOg(subtitle, 44)}
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          {stat ? (
            <div
              style={{
                display: "flex",
                fontSize: 28,
                fontWeight: 700,
                color: COLORS.primaryDark,
                backgroundColor: `${COLORS.primary}24`,
                padding: "14px 30px",
                borderRadius: 9999
              }}
            >
              {stat}
            </div>
          ) : (
            <div style={{ display: "flex" }} />
          )}
          <div style={{ fontSize: 26, color: COLORS.muted }}>{hostname}</div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts
    }
  );
}
