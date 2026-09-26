export interface AuthenticatedUser {
  id: string; // Supabase UUID
  email: string;
  role?: string;
  userMetadata?: Record<string, unknown>;
}

export interface AuthSessionResponse {
  user: AuthenticatedUser;
  accessToken: string;
}
