export type UserRole = 'admin' | 'tutor' | 'participant' | 'hr_referent'

export type ProgramStatus = 'setup' | 'level_checks' | 'groups_formation' | 'active' | 'completed'

export type Level = 'Basic1' | 'Basic2' | 'Medium' | 'High'

export type BookingStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show'

export type ConversationStatus = 'scheduled' | 'completed' | 'cancelled'

export type AttendanceStatus = 'present' | 'absent' | 'justified'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  company_id: string | null
  personal_room_link: string | null
  created_at: string
  updated_at: string
}

export interface Company {
  id: string
  name: string
  contact_email: string | null
  contact_phone: string | null
  active: boolean
  created_at: string
  updated_at: string
}

export interface TrainingProgram {
  id: string
  company_id: string
  name: string
  description: string | null
  start_date: string
  end_date: string | null
  status: ProgramStatus
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ProgramParticipant {
  id: string
  program_id: string
  participant_id: string
  level_check_completed: boolean
  assigned_level: Level | null
  level_check_date: string | null
  level_check_tutor_id: string | null
  notes: string | null
  added_at: string
  updated_at: string
}

export interface TutorAvailability {
  id: string
  tutor_id: string
  date: string
  start_time: string
  end_time: string
  is_recurring: boolean
  recurrence_rule: string | null
  recurrence_end_date: string | null
  is_booked: boolean
  availability_type: 'level_check' | 'group_session' | 'both'
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface LevelCheckSlot {
  id: string
  program_id: string
  tutor_id: string
  date: string
  start_time: string
  end_time: string
  participant_id: string | null
  status: 'available' | 'booked' | 'completed'
  notes: string | null
  created_at: string
  updated_at: string
}

export interface LevelCheckBooking {
  id: string
  participant_id: string
  tutor_id: string
  program_id: string
  availability_id: string | null
  scheduled_date: string
  scheduled_start_time: string
  scheduled_end_time: string
  personal_room_link: string
  status: BookingStatus
  completed_at: string | null
  created_at: string
  updated_at: string
}

// Tabella: conversation_groups
export interface ConversationGroup {
  id: string
  program_id: string
  tutor_id: string | null
  name: string
  level: Level
  created_at: string
  updated_at: string
}

export interface GroupMember {
  id: string
  group_id: string
  participant_id: string
  joined_at: string
}

export interface Conversation {
  id: string
  group_id: string
  program_id: string
  tutor_id: string
  scheduled_date: string
  start_time: string
  end_time: string
  duration_minutes: 30 | 45 | 60 | 90
  meeting_link: string
  status: ConversationStatus
  completed_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Attendance {
  id: string
  conversation_id: string
  participant_id: string
  status: AttendanceStatus
  notes: string | null
  recorded_by: string | null
  recorded_at: string
  updated_at: string
}