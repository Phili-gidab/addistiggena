export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    REQUESTED: 'b-requested',
    ACCEPTED: 'b-active',
    EN_ROUTE: 'b-active',
    ARRIVED: 'b-active',
    IN_PROGRESS: 'b-progress',
    COMPLETED: 'b-done',
    PAID: 'b-paid',
    // the client could not tell these apart - each outcome now reads distinctly
    REJECTED: 'b-rejected',
    EXPIRED: 'b-expired',
    CANCELLED: 'b-cancelled',
  };
  return <span className={`badge ${map[status] ?? 'b-dead'}`}>{status.replace('_', ' ')}</span>;
}
