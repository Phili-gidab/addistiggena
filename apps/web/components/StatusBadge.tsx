export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    REQUESTED: 'b-requested',
    ACCEPTED: 'b-active',
    EN_ROUTE: 'b-active',
    ARRIVED: 'b-active',
    IN_PROGRESS: 'b-progress',
    COMPLETED: 'b-done',
    PAID: 'b-paid',
    REJECTED: 'b-dead',
    EXPIRED: 'b-dead',
    CANCELLED: 'b-dead',
  };
  return <span className={`badge ${map[status] ?? 'b-dead'}`}>{status.replace('_', ' ')}</span>;
}
