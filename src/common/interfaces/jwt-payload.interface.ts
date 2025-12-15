export interface JwtPayload {
  sub: string; // userId
  roleId: string;
  teamId?: string;
  email: string;
}
