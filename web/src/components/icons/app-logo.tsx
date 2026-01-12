import type { SVGProps } from "react"

export function AppLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* Left Module */}
      <rect x="28" y="44" width="16" height="32" rx="4" fill="currentColor" />
      
      {/* Center Core */}
      <rect x="52" y="36" width="16" height="48" rx="4" fill="currentColor" />
      
      {/* Right Module */}
      <rect x="76" y="44" width="16" height="32" rx="4" fill="currentColor" />
    </svg>
  )
}
