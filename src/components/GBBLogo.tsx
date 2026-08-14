interface LogoProps {
  size?: number;
  className?: string;
}

export function GBBLogo({ size = 48, className = '' }: LogoProps) {
  return (
    <img
      src="/assets/image.png"
      alt="Goh Betoch Bank Logo"
      width={size}
      height={size}
      className={`object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
