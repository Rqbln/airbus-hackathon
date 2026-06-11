import { Badge } from "@/components/ui/Badge";
import { Panel, PanelBody, PanelHeader, Section } from "@/components/ui/Card";
import { AircraftView } from "./AircraftView";
import { buildFleetSummary, groupByAircraft, loadTimeSeries } from "@/lib/aircraft";

export default function AircraftPage() {
  const ts = loadTimeSeries();
  const grouped = groupByAircraft(ts);
  const summaries = buildFleetSummary();
  const ids = summaries.map((s) => s.aircraft_id);

  if (ids.length === 0) {
    return (
      <div className="space-y-4">
        <header>
          <h1 className="text-2xl font-semibold">Aircraft Explorer</h1>
        </header>
        <Panel>
          <PanelBody>
            <div className="py-12 text-center text-sm text-fg-dim">
              No predictions found. Run <code className="mono">scripts/04_train_ensemble.py</code> and{" "}
              <code className="mono">scripts/05_generate_dashboard_data.py</code> first.
            </div>
          </PanelBody>
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Badge variant="info" dot>
            Aircraft Explorer
          </Badge>
          <Badge variant="muted">{ids.length} aircraft</Badge>
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Per-aircraft risk timeline</h1>
          <p className="text-fg-dim mt-1.5 max-w-3xl">
            Drill into any aircraft to inspect its monthly corrosion probability, identify peak-risk months,
            and read the recommended action.
          </p>
        </div>
      </header>

      <AircraftView byAircraft={grouped} summaries={summaries} />
    </div>
  );
}
