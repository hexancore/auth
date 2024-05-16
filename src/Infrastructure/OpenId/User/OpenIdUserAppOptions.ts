import type { ClaimsParameterMember } from "openid-client";

export interface OpenIdAppRedirectMeta {
  baseUrl: string;
  errorUrl: string;
  postLogoutUrl: string;
  loginRequest: Record<string, string>;
}

export type OpenIdClaimsParameter =
  string | {
    id_token?: {
      [key: string]: ClaimsParameterMember;
    };
    userinfo?: {
      [key: string]: ClaimsParameterMember;
    };
  }

export interface OpenIdUserAppOptions {
  defaultMaxAge: number;
  apiBaseUrl: string;
  login: {
    audience?: string;
    scope?: string[];
    claims?: OpenIdClaimsParameter;
  },
  redirect: OpenIdAppRedirectMeta;
}
