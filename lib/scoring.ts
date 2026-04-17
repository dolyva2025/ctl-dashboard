import type { DailyRoutine } from './storage'

export type Recommendation = 'trade' | 'caution' | 'sit-out' | 'incomplete'

export type ScoringResult = {
  score: number
  total: number
  recommendation: Recommendation
  label: string
  description: string
  color: 'green' | 'yellow' | 'red' | 'gray'
}

// Indices of questions that count toward the score
// Non-scored (informational): 1 (session result)
const SCORED: number[] = [0, 2, 3, 4, 5, 6, 7, 8]

function isPositive(idx: number, answer: string | null): boolean {
  if (answer === null) return false
  // Q2 (sleep): Bien or Regular = positive, Mal = negative
  if (idx === 2) return answer === 'Bien' || answer === 'Regular'
  // Q7 (market structure): any clear structure = positive, Sin claridad = negative
  if (idx === 7) return answer !== 'Sin claridad'
  return answer === 'yes'
}

export function scoreRoutine(routine: DailyRoutine): ScoringResult {
  const total = SCORED.length // 7

  if (!routine.completed) {
    return {
      score: 0,
      total,
      recommendation: 'incomplete',
      label: 'Completa el cuestionario',
      description: 'Responde todas las preguntas para obtener tu recomendación del día.',
      color: 'gray',
    }
  }

  const score = SCORED.reduce(
    (sum, idx) => sum + (isPositive(idx, routine.answers[idx]) ? 1 : 0),
    0,
  )

  if (score >= 7) {
    return {
      score,
      total,
      recommendation: 'trade',
      label: 'OPERA — Las condiciones son favorables',
      description: 'Estás listo. Ejecuta tu plan y respeta tu gestión de riesgo.',
      color: 'green',
    }
  }

  if (score >= 5) {
    return {
      score,
      total,
      recommendation: 'caution',
      label: 'OPERA CON CAUTELA — Revisa tu ventaja',
      description: 'Algunas condiciones no están al 100%. Reduce tamaño o sé muy selectivo con los setups.',
      color: 'yellow',
    }
  }

  return {
    score,
    total,
    recommendation: 'sit-out',
    label: 'NO OPERES — Protege tu capital',
    description: 'Las condiciones no son favorables hoy. No operar también es una decisión.',
    color: 'red',
  }
}
