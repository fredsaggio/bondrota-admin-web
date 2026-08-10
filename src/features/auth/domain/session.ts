export interface AdminSession {
  userId: number;
  role: 'admin';
  expiresAt: number;
}
