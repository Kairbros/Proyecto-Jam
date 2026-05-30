export type JamStatus = 'DRAFT' | 'OPEN' | 'IN_PROGRESS' | 'SUBMISSIONS' | 'VOTING' | 'CLOSED'
export type TeamMode = 'SOLO_ONLY' | 'TEAMS_OPTIONAL' | 'TEAMS_ONLY'

export interface JamOrganizer {
  id: string
  username: string
  displayName: string
  avatarUrl?: string | null
}

export interface Jam {
  id: string
  slug: string
  title: string
  description: string
  rules?: string | null
  status: JamStatus
  theme?: string | null
  themeRevealed: boolean
  teamMode: TeamMode
  maxParticipants?: number | null
  maxTeamSize?: number | null
  coverUrl?: string | null
  startAt: string
  submissionsEndAt: string
  votingEndAt: string
  createdAt: string
  tags: string[]
  organizer: JamOrganizer
  _count: {
    participants: number
    submissions: number
  }
}

export interface Participant {
  id: string
  createdAt: string
  user: {
    id: string
    username: string
    displayName: string
    avatarUrl?: string | null
    isVerified: boolean
  }
  team?: { id: string; name: string } | null
}

export interface Team {
  id: string
  name: string
  createdAt: string
  _count: { members: number }
  members: Array<{
    user: {
      id: string
      username: string
      displayName: string
      avatarUrl?: string | null
    }
  }>
}

export interface Submission {
  id: string
  title: string
  description?: string | null
  fileUrl?: string | null
  fileSizeBytes?: number | null
  externalUrl?: string | null
  createdAt: string
  updatedAt: string
  user: {
    id: string
    username: string
    displayName: string
    avatarUrl?: string | null
    isVerified: boolean
  }
  team?: { id: string; name: string } | null
  screenshots: Array<{ id: string; url: string; order: number }>
  _count: { votes: number }
}

export interface Vote {
  id: string
  score: number
  comment?: string | null
  createdAt: string
  updatedAt: string
  submission: { id: string; title: string }
  voter: {
    id: string
    username: string
    displayName: string
    avatarUrl?: string | null
    isVerified: boolean
  }
}

export interface Result {
  rank: number
  voteCount: number
  avgScore: number
  submission: Submission
}
