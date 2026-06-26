import { getProductTypeLabel, normalizeProductType } from '../../utils/productType'

const typeStyles = {
  online: 'badge-online',
  local: 'badge-local',
}

export default function ProductTypeBadge({ type }) {
  const normalized = normalizeProductType(type)
  const cls = typeStyles[normalized] || typeStyles.local
  const label = getProductTypeLabel(normalized)

  return <span className={`badge ${cls}`}>{label}</span>
}
