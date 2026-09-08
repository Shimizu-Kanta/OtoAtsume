import { CoverThumbnail } from "@/components/covers/cover-thumbnail";
import { cn } from "@/lib/utils";
import type { CoverType } from "@prisma/client";

// サムネイルを CD ジャケット風の正方形として見せるラッパー（ブラー額装）。
//
// 16:9 のサムネイルを左右クロップせずに正方形へ収めるため、同じ画像をぼかして背景に敷き、
// その上に 16:9 の画像を中央配置する。歌ってみた・歌枠のサムネイルは左右にタイトル文字や
// 立ち絵を置く構図が多く、センタークロップすると情報が欠落するため。
//
// CD ショップの什器としての装飾は3つ。帯と CD 盤は任意で、既定では付かない。
//   obiText  … 左端の縦組みの帯（曲数 / 種別 / 歌唱日）
//   showDisc … 右後ろから覗く CD 盤。枠外にはみ出すので、
//              呼び出し側の親に overflow-hidden が無いことが前提。
//   グレアと内側 1px の縁 … ケースのプラスチック反射。常に付く。
export function CoverJacket({
  src,
  alt,
  coverType,
  obiText,
  obiColor,
  compact = false,
  showDisc = false,
  sizes,
  priority = false,
  className,
  iconClassName,
  children
}: {
  src: string | null;
  alt: string;
  coverType: CoverType;
  obiText?: string | null;
  obiColor?: string | null;
  compact?: boolean;
  showDisc?: boolean;
  sizes?: string;
  priority?: boolean;
  className?: string;
  iconClassName?: string;
  // ジャケット面に重ねる要素（裏ジャケの収録曲、曲数バッジなど）。
  // グレア（z-20）より上に出したい場合は z-30 以上を指定すること。
  children?: React.ReactNode;
}) {
  const square = (
    <div
      className={cn(
        "relative aspect-square w-full overflow-hidden rounded-[2px] bg-muted shadow-jacket",
        className
      )}
    >
      {/* 背景レイヤー: 同じ画像を強くぼかして額縁の帯にする。前景と同一 URL のため
          ブラウザキャッシュが効き、ネットワークリクエストは1回で済む（lib/utils.ts の
          OPTIMIZABLE_IMAGE_HOSTS を空にして next/image の最適化を切っているのが前提）。
          src が無い場合は前景のフォールバックアイコンだけを見せたいので描画しない。 */}
      {src ? (
        <div className="absolute inset-0" aria-hidden="true">
          <CoverThumbnail
            src={src}
            alt=""
            coverType={coverType}
            sizes={sizes}
            imageClassName="object-cover scale-[1.6] blur-[14px] brightness-75 saturate-125"
            // 読み込み失敗時は前景側にもフォールバックアイコンが出るため、
            // 背景側のアイコンは隠してアイコンの二重描画を避ける。
            iconClassName="hidden"
          />
        </div>
      ) : null}

      {/* 前景レイヤー: img.youtube.com の hqdefault.jpg は 480x360 の 4:3 で上下に黒帯が入る
          （実際の絵は 480x270）。aspect-video のコンテナ + object-cover で黒帯をクロップする。
          aspect-square に直接置くと黒帯が見えてしまうので必ず aspect-video にすること。 */}
      <div className="absolute inset-x-0 top-1/2 aspect-video -translate-y-1/2">
        <CoverThumbnail
          src={src}
          alt={alt}
          coverType={coverType}
          sizes={sizes}
          priority={priority}
          imageClassName="object-cover"
          iconClassName={iconClassName}
        />
      </div>

      {/* 帯（obi）: 左端の縦組み。曲数・歌唱種別・歌唱日を印字する。 */}
      {obiText ? (
        <div
          className={cn(
            "absolute inset-y-0 left-0 z-10 flex items-center justify-center overflow-hidden",
            // スマホでは棚のカードが 140px 程度になるため、固定 34px だと帯が
            // ジャケットの 1/4 を覆ってしまう。狭い幅では細くする。
            compact ? "w-[17px]" : "w-6 sm:w-[34px]"
          )}
          style={{ backgroundColor: obiColor || "var(--stamp)" }}
          aria-hidden="true"
        >
          <span
            className={cn(
              "h-full py-[5px] text-left font-mono font-semibold leading-[1.55] tracking-normal text-white [writing-mode:vertical-rl]",
              compact ? "text-[9px]" : "text-[8.5px] sm:text-[9.5px]"
            )}
            style={{ wordBreak: "keep-all", overflowWrap: "normal" }}
          >
            {obiText}
          </span>
        </div>
      ) : null}

      {children}

      {/* グレア（CDケースのプラスチック反射）と、内側 1px の縁。 */}
      <span aria-hidden="true" className="jacket-glare pointer-events-none absolute inset-0 z-20" />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-20 rounded-[2px] shadow-[inset_0_0_0_1px_rgba(22,33,43,.14)]"
      />
    </div>
  );

  if (!showDisc) {
    return square;
  }

  // CD 盤はジャケットの右後ろに置く。枠からはみ出す前提なので、
  // この relative ラッパーの親で overflow を切らないこと。
  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="cd-disc absolute right-[-13%] top-[10%] flex aspect-square w-[72%] items-center justify-center rounded-full"
      >
        <div className="cd-disc-hole aspect-square w-[20%] rounded-full" />
      </div>
      {square}
    </div>
  );
}
