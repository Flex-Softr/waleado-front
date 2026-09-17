import Link from "next/link";
import Image from "next/image";

export function BrandMark({ isCollapsed }: { isCollapsed?: boolean }) {
  if (isCollapsed) {
    return (
      <Link
        href="/"
        className="flex items-center justify-center w-full min-w-0 transition-opacity hover:opacity-90"
        title="Waleado"
      >
        <Image
          src="/icon.png"
          alt="Waleado"
          width={44}
          height={44}
          className="size-10 sm:size-11 rounded-lg object-contain"
          priority
        />
      </Link>
    );
  }

  return (
    <Link
      href="/"
      className="flex items-center gap-2.5 min-w-0 transition-opacity hover:opacity-90"
    >
      {/* Light theme logo (dark text) */}
      <Image
        src="/logo.png"
        alt="Waleado"
        width={180}
        height={50}
        className="h-10 sm:h-11 w-auto max-w-[190px] object-contain dark:hidden"
        priority
      />
      {/* Dark theme logo (light text) */}
      <Image
        src="/logo.white.png"
        alt="Waleado"
        width={180}
        height={50}
        className="hidden h-10 sm:h-11 w-auto max-w-[190px] object-contain dark:block"
        priority
      />
    </Link>
  );
}
