import type { DefineErrorsUnion } from "@hexancore/common";

export const AuthSessionErrors = {
  session_data_create_from_plain: 'core.auth.infra.session.data.create_from_plain',
  session_cookie_invalid: 'core.auth.infra.session.http.session_cookie_invalid',
  session_not_found: 'core.auth.infra.session.session_not_found',
  config_cookie_sign_secret_invalid: 'core.auth.infra.session.config_cookie_sign_secret_invalid'
} as const;
export type AuthSessionErrors<K extends keyof typeof AuthSessionErrors, internal extends 'internal' | 'never_internal' = 'internal'> = DefineErrorsUnion<
  typeof AuthSessionErrors,
  K,
  internal
>;