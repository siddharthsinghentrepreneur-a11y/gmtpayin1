import Image from "next/image";

type BrandLogoProps = {
  size?: number;
  showLabel?: boolean;
  labelClassName?: string;
  className?: string;
  imageClassName?: string;
};

export function BrandLogo({
  size = 44,
  showLabel = false,
  labelClassName = "",
  className = "",
  imageClassName = "",
}: BrandLogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`.trim()}>
      <Image
        src="/gmtpayicon.png"
        alt="GMTPay logo"
        width={size}
        height={size}
        className={`rounded-xl object-cover ${imageClassName}`.trim()}
        priority
      />
      {showLabel ? (
        <span className={`font-bold tracking-tight ${labelClassName}`.trim()}>
          GMTPay
        </span>
      ) : null}
    </div>
  );
}
