import jwt from 'jsonwebtoken';
import { ITokenService } from '../../domain/services/token.service';

export class JWTService implements ITokenService {
  generate(userId: string): string {
    return jwt.sign(
      { id: userId },
      process.env.JWT_SECRET as string,
      {
        expiresIn: process.env.JWT_EXPIRE as string,
      }
    );
  }

  verify(token: string): { id: string } {
    return jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as { id: string };
  }
}

export default new JWTService();