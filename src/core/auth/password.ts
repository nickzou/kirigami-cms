export const MIN_PASSWORD_LENGTH = 8;

/**
 * What is wrong with a site password, or `undefined` if it is fine. There is
 * no limit on guesses yet, so a short password is refused outright.
 */
export function passwordProblem(password: string): string | undefined {
  return password.length < MIN_PASSWORD_LENGTH
    ? `The password must be at least ${MIN_PASSWORD_LENGTH} characters long.`
    : undefined;
}
