
export function StatusCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="card kpi">
      <strong>{value}</strong>
      <p>{label}</p>
    </div>
  );
}
