export interface IJwtPayload {
  /** User UUID */
  readonly sub: string;
  /** User email */
  readonly email: string;
  /** Assigned role names */
  readonly roles: string[];
  /** User first name */
  readonly firstName: string;
}
