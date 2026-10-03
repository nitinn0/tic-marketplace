import { Container } from "@/components/common/container";
import { EmptyState } from "@/components/common/empty-state";

export default function DashboardPage() {
  return (
    <Container className="py-16">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">
          Workspace
        </p>
        <h1 className="mt-3 text-3xl font-bold text-slate-900">Dashboard</h1>
        <div className="mt-8">
          <EmptyState
            title="No dashboard data yet"
            description="This placeholder screen is part of the foundation for upcoming marketplace workflows."
          />
        </div>
      </div>
    </Container>
  );
}
