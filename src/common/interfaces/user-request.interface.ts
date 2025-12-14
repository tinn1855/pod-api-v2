import { Request } from 'express';
import { JwtPayload } from './jwt-payload.interface';

export interface UserRequest extends Request {
  user: JwtPayload;
}
