import jwt, { SignOptions } from 'jsonwebtoken';
import { ITokenService } from '../../domain/services/token.service';

export class JWTService implements ITokenService {
  generate(userId: string): string {
    const options: SignOptions = {
      expiresIn: (process.env.JWT_EXPIRE || '7d') as SignOptions['expiresIn'],
    };
    return jwt.sign({ id: userId }, process.env.JWT_SECRET as string, options);
  }

  verify(token: string): { id: string } {
    return jwt.verify(token, process.env.JWT_SECRET as string) as { id: string };
  }
}

export default new JWTService();
