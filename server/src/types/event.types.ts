// Event types

export type EventCategory = 
  | 'cultural' 
  | 'sports' 
  | 'workshop' 
  | 'trip' 
  | 'party' 
  | 'hackathon' 
  | 'other'

export type EventVisibility = 'public' | 'private'

export interface CreateEventDto {
  name: string
  description?: string
  category: EventCategory
  date: string // ISO 8601
  location?: string
  visibility: EventVisibility
}

export interface UpdateEventDto {
  name?: string
  description?: string
  category?: EventCategory
  date?: string
  location?: string
  visibility?: EventVisibility
  coverPhotoId?: string
}

export interface EventQuery {
  sort?: 'date_desc' | 'date_asc' | 'name_asc'
  category?: EventCategory[]
  from?: string // ISO date
  to?: string // ISO date
  visibility?: EventVisibility
  page?: number
  pageSize?: number
}

export interface Event {
  id: string
  clubId: string
  name: string
  description: string | null
  category: EventCategory
  date: Date
  location: string | null
  visibility: EventVisibility
  coverPhotoId: string | null
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface EventSummary {
  id: string
  clubId: string
  name: string
  category: EventCategory
  date: Date
  visibility: EventVisibility
  coverPhotoUrl: string | null
  photoCount: number
}

export interface ViewerContext {
  userId?: string
  clubMemberships: Record<string, string> // clubId → role
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}
