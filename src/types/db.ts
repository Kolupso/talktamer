// Hand-written types mirroring supabase/migrations/0001_initial_schema.sql.
// If the schema changes, update these too. (Can later be replaced by
// `supabase gen types typescript` output once the Supabase CLI is set up.)

export type Gender = 'man' | 'woman' | 'enby'
export type TimerStatus = 'idle' | 'running' | 'paused' | 'finished'

export interface Speaker {
  id: number
  name: string
  gender: Gender
  created_at: string
}

export interface Debate {
  id: number
  name: string
  is_active: boolean
  created_at: string

  first_time_seconds: number
  multi_time_seconds: number

  yellow_threshold_seconds: number
  red_threshold_seconds: number
  show_color_indicators: boolean

  rule1_enabled: boolean
  rule2_enabled: boolean
  rule3_enabled: boolean

  list_closed: boolean
  show_gender_indicators: boolean
  show_countdown_on_waiting: boolean
}

export interface DebateParticipation {
  id: number
  debate_id: number
  speaker_id: number
  speak_count: number
}

export interface WaitingListEntry {
  id: number
  debate_id: number
  speaker_id: number
  entered_at: string
  position: number
  locked: boolean
  skipped: boolean
}

export interface TimerState {
  debate_id: number
  current_speaker_id: number | null
  current_is_first_time: boolean | null
  duration_seconds: number
  status: TimerStatus
  started_at: string | null
  accumulated_seconds: number
}

export interface SpeechLogEntry {
  id: number
  debate_id: number
  speaker_id: number | null
  speaker_name: string
  speaker_gender: Gender
  was_first_time: boolean
  allotted_seconds: number
  spoke_seconds: number
  removed: boolean
  created_at: string
}
