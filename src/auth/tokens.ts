import { SignJWT, jwtVerify } from "jose";

const ISSUER = "surejob-api";
const ALGORITHM = "HS256";

export interface TokenClaims {
  userId: string;
}

/** Issues and verifies HS256 access tokens. The subject is the user id; roles are read fresh from the store. */
export class TokenService {
  readonly #key: Uint8Array;
  readonly #ttl: string;

  constructor(secret: string, ttl: string) {
    this.#key = new TextEncoder().encode(secret);
    this.#ttl = ttl;
  }

  async sign(userId: string): Promise<string> {
    return new SignJWT({})
      .setProtectedHeader({ alg: ALGORITHM })
      .setSubject(userId)
      .setIssuer(ISSUER)
      .setIssuedAt()
      .setExpirationTime(this.#ttl)
      .sign(this.#key);
  }

  /** Returns null for any invalid, expired or tampered token. */
  async verify(token: string): Promise<TokenClaims | null> {
    try {
      const { payload } = await jwtVerify(token, this.#key, { issuer: ISSUER, algorithms: [ALGORITHM] });
      return typeof payload.sub === "string" ? { userId: payload.sub } : null;
    } catch {
      return null;
    }
  }
}
