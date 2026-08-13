export interface AdminSession {
  userId: string;
  role: 'admin';
  expiresAt: number;
}
