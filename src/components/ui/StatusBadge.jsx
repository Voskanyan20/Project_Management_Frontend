const statusStyles = {
  Completed: 'badge-completed',
  Processing: 'badge-processing',
  Pending: 'badge-pending',
  Cancelled: 'badge-cancelled',
  Active: 'badge-active',
  Draft: 'badge-draft',
  Archived: 'badge-archived',
}

const statusLabels = {
  Completed: 'Завершено',
  Processing: 'В обработке',
  Pending: 'Ожидает',
  Cancelled: 'Отменено',
  Active: 'Активно',
  Draft: 'Черновик',
  Archived: 'Архив',
}

export default function StatusBadge({ status }) {
  const cls = statusStyles[status] || 'badge-pending'
  const label = statusLabels[status] || status
  return <span className={`badge ${cls}`}>{label}</span>
}
