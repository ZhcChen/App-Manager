import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function BaseIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    />
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="8.5" cy="8.5" r="4.5" />
      <path d="M12 12l4 4" />
    </BaseIcon>
  );
}

export function RefreshIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M15.5 6.5V3.8h-2.7" />
      <path d="M15.3 3.8a6.6 6.6 0 0 0-9.8 1" />
      <path d="M4.5 13.5v2.7h2.7" />
      <path d="M4.7 16.2a6.6 6.6 0 0 0 9.8-1" />
    </BaseIcon>
  );
}

export function StopIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="4.5" y="4.5" width="11" height="11" rx="3" />
      <path d="M7.5 7.5l5 5" />
      <path d="M12.5 7.5l-5 5" />
    </BaseIcon>
  );
}

export function ActivityIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M2.5 10h3l2-4 3 8 2.5-5h4.5" />
    </BaseIcon>
  );
}

export function PortIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M4 5.5h12" />
      <path d="M6.5 5.5v4" />
      <path d="M13.5 5.5v4" />
      <path d="M10 9.5v5" />
      <path d="M7 14.5h6" />
    </BaseIcon>
  );
}

export function DesktopIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="3.5" y="4" width="13" height="9" rx="2" />
      <path d="M8 16h4" />
      <path d="M10 13v3" />
    </BaseIcon>
  );
}

export function AlertIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="10" cy="10" r="7" />
      <path d="M10 6.5v4" />
      <path d="M10 12.8h.01" />
    </BaseIcon>
  );
}

export function SuccessIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <circle cx="10" cy="10" r="7" />
      <path d="M6.8 10.1l2.1 2.1 4.3-4.4" />
    </BaseIcon>
  );
}

export function AppTileIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <rect x="3.5" y="3.5" width="13" height="13" rx="3" />
      <path d="M6.8 7.2h6.4" />
      <path d="M6.8 10h4.6" />
      <path d="M6.8 12.8h3.1" />
    </BaseIcon>
  );
}
