"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  size?: number;
  className?: string;
  imageClassName?: string;
}

export default function BrandLogo({
  size = 40,
  className,
  imageClassName,
}: BrandLogoProps) {
  return (
    <div
      className={cn("relative overflow-hidden rounded-xl shrink-0", className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <Image
        src="/logo.jpeg"
        alt="InterceptAI logo"
        fill
        sizes={`${size}px`}
        className={cn("object-cover", imageClassName)}
        priority
      />
    </div>
  );
}