import { TokenSet } from 'openid-client';
import { Jwt } from '../../../Jwt';
import { OK, R, Result, UserId, ERR, AppErrorCode } from '@hexancore/common';

export const OpenIdAuthDataCreateError = 'core.auth.infra.openid.user.session.openid_auth_data_create';

const ID_TOKEN_CLAIMS_TO_DELETE = [
  'acr',
  'amr',
  'at_hash',
  'aud',
  'auth_time',
  'azp',
  'c_hash',
  'exp',
  'iat',
  'iss',
  'nonce',
  's_hash',
  'sub',
  'sid'
];


export class OpenIdAuthData {
  public constructor(
    public readonly userId: UserId,
    public readonly claims: Record<string, any>,
    public readonly idToken: Jwt,
    public readonly accessToken: Jwt,
    public readonly refreshToken?: Jwt
  ) { }

  public static createFromTokenSet(tokenSet: TokenSet): R<OpenIdAuthData> {
    if (!tokenSet.id_token) {
      return ERR(OpenIdAuthDataCreateError, AppErrorCode.INTERNAL_ERROR, 'token_set missing id_token');
    }

    const { userId, claims } = OpenIdAuthData.extractClaimsFromTokenSet(tokenSet);
    return OpenIdAuthData.c({
      userId,
      claims,
      idToken: { value: tokenSet.id_token, expireAt: tokenSet.expires_at },
      accessToken: { value: tokenSet.access_token, expireAt: tokenSet.expires_at },
      refreshToken: tokenSet.refresh_token ? Jwt.c(tokenSet.refresh_token) : null
    });
  }

  private static extractClaimsFromTokenSet(tokenSet: TokenSet): { userId: string, claims: Record<string, any> } {
    const claims = tokenSet.claims();
    const userId = claims.sub;
    ID_TOKEN_CLAIMS_TO_DELETE.forEach((claim) => {
      claims[claim] = undefined;
    });
    return { userId, claims };
  }

  public static c(plain: Record<string, any>): R<OpenIdAuthData> {
    return Result.all({
      userId: UserId.c(plain?.userId),
      claims: OK(plain?.claims ?? {}),
      idToken: Jwt.c(plain?.idToken ?? ''),
      accessToken: Jwt.c(plain?.accessToken ?? ''),
      refreshToken: plain?.refreshToken ? Jwt.c(plain?.refreshToken) : OK(null),
    }, OpenIdAuthDataCreateError).onOk((v) => new OpenIdAuthData(v.userId, v.claims, v.idToken, v.accessToken, v.refreshToken));
  }

  public getClaims<T>(): T {
    return this.claims as T;
  }
}
