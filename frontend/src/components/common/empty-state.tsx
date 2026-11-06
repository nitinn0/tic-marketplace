export function EmptyState({
  title = "No items available",
  description = "There is nothing to show yet.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-[#D9C8B0] bg-white/70 px-6 py-12 text-center">
      <h3 className="font-display text-xl font-bold text-[#12303A]">{title}</h3>
      <p className="mt-2 text-sm text-[#5A6A6F]">{description}</p>
    </div>
  );
}
