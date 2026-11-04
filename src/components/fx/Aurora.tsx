/** Slow-moving blurred colour fields for dark sections. CSS only. */
export function Aurora({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <div className="absolute -left-1/4 top-0 h-[60%] w-[60%] animate-aurora rounded-full bg-primary/40 blur-[100px]" />
      <div className="absolute right-[-10%] top-[20%] h-[55%] w-[50%] animate-aurora rounded-full bg-accent/30 blur-[110px] [animation-delay:-6s]" />
      <div className="absolute bottom-[-20%] left-[30%] h-[50%] w-[45%] animate-aurora rounded-full bg-gold/30 blur-[100px] [animation-delay:-12s]" />
    </div>
  );
}
