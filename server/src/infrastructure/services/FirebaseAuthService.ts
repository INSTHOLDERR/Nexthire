import admin from "../config/firebase";
import { IGoogleAuthService, GoogleTokenPayload} from "../../domain/services/google-auth.service";

export class FirebaseAuthService
  implements IGoogleAuthService
{
  async verifyIdToken(
    idToken: string
  ): Promise<GoogleTokenPayload> {
    const decoded = await admin
      .auth()
      .verifyIdToken(idToken);

    return {
      uid: decoded.uid,
      email: decoded.email ?? "",
      name: decoded.name,
      picture: decoded.picture,
    };
  }
}