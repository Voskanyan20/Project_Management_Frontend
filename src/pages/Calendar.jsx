import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Plus, Clock, Edit, Trash2 } from 'lucide-react'
import { getNotes, deleteNote } from '../api'
import { PageHeader } from '../components/ui/TableHelpers'
import NoteFormModal from '../components/calendar/NoteFormModal'
import { ConfirmDialog } from '../components/ui/ActionsMenu'

const WEEKDAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']
const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
]

const EVENT_COLORS = [
  { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' },
  { bg: '#fef3c7', text: '#b45309', border: '#fde68a' },
  { bg: '#fee2e2', text: '#b91c1c', border: '#fecaca' },
  { bg: '#dbeafe', text: '#1d4ed8', border: '#bfdbfe' },
  { bg: '#f3e8ff', text: '#7e22ce', border: '#e9d5ff' },
]

function getEventColor(id) {
  return EVENT_COLORS[id % EVENT_COLORS.length]
}

function getCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()
  const cells = []

  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ day: daysInPrevMonth - i, current: false, date: new Date(year, month - 1, daysInPrevMonth - i) })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, current: true, date: new Date(year, month, d) })
  }
  const remaining = 42 - cells.length
  for (let d = 1; d <= remaining; d++) {
    cells.push({ day: d, current: false, date: new Date(year, month + 1, d) })
  }
  return cells
}

function dateKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export default function Calendar() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editNote, setEditNote] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const loadNotes = useCallback(() => {
    setLoading(true)
    getNotes()
      .then(setNotes)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadNotes()
  }, [loadNotes])

  const notesByDate = useMemo(() => {
    const map = {}
    notes.forEach((note) => {
      if (!note.deadline) return
      const key = note.deadline.slice(0, 10)
      if (!map[key]) map[key] = []
      map[key].push(note)
    })
    return map
  }, [notes])

  const selectedNotes = selectedDate ? notesByDate[dateKey(selectedDate)] || [] : []

  const upcoming = useMemo(
    () =>
      notes
        .filter((n) => n.deadline && !n.is_completed)
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
        .slice(0, 5),
    [notes]
  )

  const calendarDays = getCalendarDays(year, month)

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))
  const goToday = () => {
    const today = new Date()
    setCurrentDate(today)
    setSelectedDate(today)
  }

  const openCreate = () => {
    setEditNote(null)
    setFormOpen(true)
  }

  useEffect(() => {
    if (searchParams.get('action') === 'create') {
      openCreate()
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const openEdit = (note) => {
    setEditNote(note)
    setFormOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteNote(deleteTarget.id)
      setDeleteTarget(null)
      loadNotes()
    } catch (err) {
      console.error(err)
    } finally {
      setDeleting(false)
    }
  }

  const defaultDate = selectedDate ? dateKey(selectedDate) : ''

  if (loading && notes.length === 0) {
    return <div className="page-loading">Загрузка календаря...</div>
  }

  return (
    <div className="calendar-page">
      <PageHeader
        title="Календарь"
        subtitle="Планируйте и управляйте событиями"
        action={
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} />
            Добавить событие
          </button>
        }
      />

      <div className="calendar-layout">
        <div className="card calendar-card">
          <div className="calendar-header">
            <div className="calendar-nav">
              <button type="button" className="icon-btn-sm" onClick={prevMonth}>
                <ChevronLeft size={18} />
              </button>
              <button type="button" className="icon-btn-sm" onClick={nextMonth}>
                <ChevronRight size={18} />
              </button>
              <h2>{MONTHS[month]} {year}</h2>
            </div>
            <button type="button" className="btn btn-outline btn-sm" onClick={goToday}>
              Сегодня
            </button>
          </div>

          <div className="calendar-grid">
            {WEEKDAYS.map((day) => (
              <div key={day} className="calendar-weekday">{day}</div>
            ))}
            {calendarDays.map((cell, i) => {
              const key = dateKey(cell.date)
              const events = notesByDate[key] || []
              const isSelected = selectedDate && dateKey(selectedDate) === key
              const isToday = dateKey(new Date()) === key

              return (
                <button
                  key={i}
                  type="button"
                  className={`calendar-cell${cell.current ? '' : ' other-month'}${isSelected ? ' selected' : ''}${isToday ? ' today' : ''}`}
                  onClick={() => setSelectedDate(cell.date)}
                >
                  <span className="cell-day">{cell.day}</span>
                  <div className="cell-events">
                    {events.slice(0, 3).map((event) => {
                      const colors = getEventColor(event.id)
                      return (
                        <span
                          key={event.id}
                          className="event-tag"
                          style={{
                            background: colors.bg,
                            color: colors.text,
                            borderColor: colors.border,
                          }}
                        >
                          {event.title}
                        </span>
                      )
                    })}
                    {events.length > 3 && (
                      <span className="event-more">+{events.length - 3} еще</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="calendar-sidebar">
          <div className="card sidebar-card">
            {selectedDate ? (
              selectedNotes.length > 0 ? (
                <div className="event-detail">
                  <h3>{selectedDate.toLocaleDateString('ru-RU', { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
                  <ul className="event-list">
                    {selectedNotes.map((note) => {
                      const colors = getEventColor(note.id)
                      return (
                        <li key={note.id} style={{ borderLeftColor: colors.text }}>
                          <div className="event-list-header">
                            <strong>{note.title}</strong>
                            <div className="event-list-actions">
                              <button type="button" className="icon-btn-sm" onClick={() => openEdit(note)} aria-label="Редактировать">
                                <Edit size={14} />
                              </button>
                              <button type="button" className="icon-btn-sm danger-text" onClick={() => setDeleteTarget(note)} aria-label="Удалить">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                          {note.description && <p>{note.description}</p>}
                          {note.is_completed && <span className="completed-tag">Выполнено</span>}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ) : (
                <div className="empty-state">
                  <Clock size={32} strokeWidth={1.5} />
                  <h3>Нет событий</h3>
                  <p>Для этого дня не запланировано событий.</p>
                  <button type="button" className="btn btn-outline btn-sm" onClick={openCreate}>
                    Добавить событие
                  </button>
                </div>
              )
            ) : (
              <div className="empty-state">
                <Clock size={32} strokeWidth={1.5} />
                <h3>Данные не выбраны</h3>
                <p>Нажмите на день в календаре, чтобы посмотреть события.</p>
              </div>
            )}
          </div>

          <div className="card sidebar-card">
            <h3 className="sidebar-card-title">Ближайшие события</h3>
            {upcoming.length === 0 ? (
              <p className="empty-text">Нет ближайших событий.</p>
            ) : (
              <ul className="upcoming-list">
                {upcoming.map((note) => {
                  const colors = getEventColor(note.id)
                  return (
                    <li key={note.id}>
                      <span className="upcoming-dot" style={{ background: colors.text }} />
                      <div className="upcoming-content">
                        <strong>{note.title}</strong>
                        <span>{new Date(note.deadline).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' })}</span>
                      </div>
                      <button type="button" className="icon-btn-sm" onClick={() => openEdit(note)} aria-label="Редактировать">
                        <Edit size={13} />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      <NoteFormModal
        open={formOpen}
        note={editNote}
        defaultDate={defaultDate}
        onClose={() => setFormOpen(false)}
        onSaved={loadNotes}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Удалить событие"
        message={`Вы уверены, что хотите удалить "${deleteTarget?.title}"?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  )
}
