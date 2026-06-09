// Club and membership types

export interface CreateClubDto {
  name: string
  description?: string
  logoUrl?: string
}

export interface UpdateClubDto {
  name?: string
  description?: string
  logoUrl?: string
}

export interface AddMemberDto {
  userId: string
  role: ClubRole
}

export interface UpdateMemberRoleDto {
  role: ClubRole
}

export type ClubRole = 'admin' | 'photographer' | 'member'

export interface ClubMember {
  clubId: string
  userId: string
  role: ClubRole
  joinedAt: Date
}

export interface Club {
  id: string
  name: string
  description: string | null
  logoUrl: string | null
  createdBy: string
  createdAt: Date
}
