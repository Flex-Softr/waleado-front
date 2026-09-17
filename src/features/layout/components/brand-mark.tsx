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
          width={36}
          height={36}
          className="size-9 rounded-lg object-contain"
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
      <Image
        src="/logo.png"
        alt="Waleado"
        width={140}
        height={40}
        className="h-8 w-auto max-w-[170px] object-contain"
        priority
      />
    </Link>
  );
}
