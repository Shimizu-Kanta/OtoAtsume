import { CoverThumbnail } from "@/components/covers/cover-thumbnail";
import { cn } from "@/lib/utils";
import type { CoverType } from "@prisma/client";

// サムネイルを CD ジャケット風の正方形として見せるラッパー。
//
// variant="frame"（グリッド用・ブラー額装）
//   16:9 のサムネイルを左右クロップせずに正方形へ収めるため、同じ画像をぼかして背景に敷き、
//   その上に 16:9 の画像を中央配置する。歌ってみた・歌枠のサムネイルは左右にタイトル文字や
//   立ち絵を置く構図が多く、センタークロップすると情報が欠落するため。
// variant="crop"（リスト行用）
//   56px 程度の小サイズでは額装すると絵が小さくなりすぎて判別できないため、
//   センタークロップを使う。
export function CoverJacket({
  src,
  alt,
  coverType,
  variant = "frame",
  sizes,
  priority = false,
  className,
  iconClassName
}: {
  src: string | null;
  alt: string;
  coverType: CoverType;
  variant?: "frame" | "crop";
  sizes?: string;
  priority?: boolean;
  className?: string;
  iconClassName?: string;
}) {
  if (variant === "crop") {
    return (
      <div className={cn("relative aspect-square overflow-hidden", className)}>
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
    );
  }

  return (
    <div
      className={cn(
        "relative aspect-square w-full overflow-hidden rounded-[6px] bg-muted",
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
    </div>
  );
}
