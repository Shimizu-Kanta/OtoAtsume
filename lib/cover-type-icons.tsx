import { FileQuestion, Mic, Video, Zap } from "lucide-react";

import { LiveEventIcon } from "@/components/icons/live-event-icon";
import type { CoverType } from "@prisma/client";

export const coverTypeFallbackIcons: Record<
  CoverType,
  React.ComponentType<React.SVGProps<SVGSVGElement>>
> = {
  COVER_VIDEO: Video,
  KARAOKE_STREAM: Mic,
  LIVE_EVENT: LiveEventIcon,
  SHORT: Zap,
  OTHER: FileQuestion
};

export function CoverTypeFallbackIcon({
  coverType,
  className
}: {
  coverType: CoverType;
  className?: string;
}) {
  const Icon = coverTypeFallbackIcons[coverType];
  return <Icon className={className} aria-hidden="true" />;
}
