export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex min-h-[12rem] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-8 text-slate-600">
      <div className="flex items-center gap-3">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-sky-700" />
        <span className="text-sm font-medium">{label}</span>
      </div>
    </div>
  );
}
