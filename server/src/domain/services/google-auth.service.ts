export interface GoogleTokenPayload {
  uid: string;
  email: string;
  name?: string;
  picture?: string;
}
export interface IGoogleAuthService {
  verifyIdToken(
    idToken: string
  ): Promise<GoogleTokenPayload>;
}