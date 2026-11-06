export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex min-h-[12rem] items-center justify-center rounded-3xl border border-[#EADFCF] bg-white p-8 text-[#5A6A6F]">
      <div className="flex items-center gap-3">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#EADFCF] border-t-[#0F4C5C]" />
        <span className="text-sm font-medium">{label}</span>
      </div>
    </div>
  );
}
