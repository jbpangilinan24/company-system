export type UserRole = 'ADMIN' | 'MEMBER'

export type User = {
  id: number
  name: string
  email: string
  role: UserRole
}