export type TokenType = 'access' | 'temp';

export interface JwtPayload {
  sub: string; // userId
  roleId: string;
  teamId?: string;
  email: string;
  type: TokenType; // 'access' for normal tokens, 'temp' for password-change-only tokens
}
