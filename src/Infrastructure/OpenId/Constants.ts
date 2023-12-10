export const OpenIdClientToken = 'HC_AUTH_OPENID_CLIENT';
export const OpenIdUserApiOptionsToken = 'HC_AUTH_OPENID_USER_OPTIONS';
export const DEFAULT_REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60;

export function defaultOptionValue(current: any, defaultValue: any): any {
  return current === undefined ? defaultValue : current;
}
