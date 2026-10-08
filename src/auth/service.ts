import { randomBytes } from "node:crypto";
import { DomainError } from "../errors.ts";
import type { Logger } from "../logger.ts";
import { toUserView, type UserView } from "../jobs/view.ts";
import { DuplicateEmailError, type Party, type Store, type UserRecord } from "../store/types.ts";
import { hashPassword, verifyPassword } from "./passwords.ts";
import type { TokenService } from "./tokens.ts";

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role: Party;
  phone: string;
  trade?: string | undefined;
}

export interface AuthResult {
  token: string;
  user: UserView;
}

/** Email + password accounts for customers and workers, issuing JWT bearer tokens. */
export class AuthService {
  readonly #store: Store;
  readonly #tokens: TokenService;
  readonly #log: Logger;
  /** Compared against when the email is unknown, so login timing does not reveal which emails exist. */
  #dummyHash: Promise<string> | undefined;

  constructor(options: { store: Store; tokens: TokenService; logger: Logger }) {
    this.#store = options.store;
    this.#tokens = options.tokens;
    this.#log = options.logger;
  }

  async register(input: RegisterInput): Promise<AuthResult> {
    const user: UserRecord = {
      id: `usr_${randomBytes(8).toString("hex")}`,
      name: input.name.trim(),
      role: input.role,
      phone: input.phone,
      trade: input.trade?.trim() || null,
      email: normalizeEmail(input.email),
      passwordHash: await hashPassword(input.password),
    };
    try {
      await this.#store.insertUser(user);
    } catch (err) {
      if (err instanceof DuplicateEmailError) throw new DomainError("EMAIL_TAKEN", "an account with this email already exists");
      throw err;
    }
    this.#log.info("user registered", { userId: user.id, role: user.role });
    return { token: await this.#tokens.sign(user.id), user: toUserView(user) };
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const user = await this.#store.getUserByEmail(normalizeEmail(email));
    const hash = user?.passwordHash ?? (await (this.#dummyHash ??= hashPassword(randomBytes(16).toString("hex"))));
    const valid = await verifyPassword(password, hash);
    if (!user?.passwordHash || !valid) throw new DomainError("INVALID_CREDENTIALS", "email or password is incorrect");
    return { token: await this.#tokens.sign(user.id), user: toUserView(user) };
  }

  /** Resolves an `Authorization: Bearer <token>` header to the current user, or throws UNAUTHORIZED. */
  async authenticate(authorization: string | undefined): Promise<UserRecord> {
    const token = /^Bearer\s+(\S+)$/i.exec(authorization ?? "")?.[1];
    if (!token) throw new DomainError("UNAUTHORIZED", "log in first: missing bearer token");
    const claims = await this.#tokens.verify(token);
    // A demo reset deletes registered users, so a valid token can point at nobody.
    const user = claims ? await this.#store.getUser(claims.userId) : null;
    if (!user) throw new DomainError("UNAUTHORIZED", "session expired or invalid; log in again");
    return user;
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
