export interface ITokenService {
  generate(userId: string): string;
  verify(token: string): { id: string };
}
