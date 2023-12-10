export interface OpenIdAppRedirectMeta {
  baseUri: string;
  errorUri: string;
  logoutUri: string;
  loginRequest: Record<string, string>;
}

/**
 * Represents all app properties used for openid protocol
 */
export interface OpenIdAppMeta {
  name: string;
  loginScope: string[];
  redirect: OpenIdAppRedirectMeta;
}
