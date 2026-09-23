import { Card, CardContent } from "@/components/ui/card";

type StatTileProps = {
  label: string;
  value: React.ReactNode;
  hint?: string;
};

export function StatTile({ label, value, hint }: StatTileProps) {
  return (
    <Card>
      <CardContent className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {/* Fixed row height so a tile holding a badge lines up with tiles holding a
            number. Proportional figures, not tabular: tabular-nums loosens large values. */}
        <div className="flex min-h-9 items-center text-2xl font-semibold text-foreground">
          {value}
        </div>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
