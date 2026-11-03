// Contract of POST /api/sensei/review (docs/specs/06). The route lands in P09.
export interface SenseiReview {
  criteria: { id: string; score: number; comment: string }[]
  score: number
  strengths: string[]
  nextSteps: string[]
  variation: { idea: string; code: string }
}
