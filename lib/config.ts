export const ADMIN_EMAIL = 'dolypva@gmail.com'
export const ADMIN_DISPLAY_NAME = 'Collective Trade Lab'

export function isAdmin(email: string): boolean {
  return email === ADMIN_EMAIL
}
