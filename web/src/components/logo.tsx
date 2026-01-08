
export function Logo({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg
        width="40"
        height="40"
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        {/* Left Module */}
        <rect x="28" y="44" width="16" height="32" rx="4" fill="#000" />
        
        {/* Center Core */}
        <rect x="52" y="36" width="16" height="48" rx="4" fill="#000" />
        
        {/* Right Module */}
        <rect x="76" y="44" width="16" height="32" rx="4" fill="#000" />
      </svg>
      <span className="text-xl font-bold text-slate-900 tracking-tight">Super Agent</span>
    </div>
  );
}
