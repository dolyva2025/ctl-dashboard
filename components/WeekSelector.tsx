'use client'

type Props = {
  selected: string
  onChange: (date: string) => void
}

function getWeekDays(): { date: string; label: string; short: string }[] {
  const today = new Date()
  const day = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1))

  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const date = d.toISOString().split('T')[0]
    const label = d.toLocaleDateString('es-ES', { weekday: 'short' })
    const short = String(d.getDate())
    return { date, label, short }
  })
}

export function WeekSelector({ selected, onChange }: Props) {
  const days = getWeekDays()
  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="flex items-center gap-1 bg-zinc-100 rounded-xl p-1">
      {days.map(({ date, label, short }) => {
        const isSelected = date === selected
        const isToday = date === today
        return (
          <button
            key={date}
            onClick={() => onChange(date)}
            className={`flex flex-col items-center px-3 py-2 rounded-lg text-xs font-medium transition-all min-w-[48px] ${
              isSelected
                ? 'bg-zinc-900 text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-900 hover:bg-white'
            }`}
          >
            <span className="uppercase tracking-wide text-[10px]">{label}</span>
            <span className={`text-sm font-bold mt-0.5 ${isToday && !isSelected ? 'text-zinc-900' : ''}`}>
              {short}
            </span>
            {isToday && (
              <span className={`w-1 h-1 rounded-full mt-0.5 ${isSelected ? 'bg-white' : 'bg-zinc-900'}`} />
            )}
          </button>
        )
      })}
    </div>
  )
}
