// ライブ・イベント用のドーム会場風アイコン。lucide-react と同じ
// stroke ベースの見た目（24px viewBox / strokeWidth 2）に合わせている。
export function LiveEventIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M2 21h20" />
      <path d="M4 21v-4a8 8 0 0 1 16 0v4" />
      <path d="M10 21v-3a2 2 0 0 1 4 0v3" />
      <path d="M12 9V6" />
    </svg>
  );
}
