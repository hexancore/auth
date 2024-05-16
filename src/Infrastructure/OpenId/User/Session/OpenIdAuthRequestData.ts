import { R, OK, ERR, type JsonSerialize, AppErrorCode } from '@hexancore/common';

export const OpenIdAuthRequestDataCreateError = 'core.auth.infra.openid.user.session.openid_auth_request_data_create';

export class OpenIdAuthRequestData implements JsonSerialize {
  public constructor(
    public readonly state: string,
    public readonly nonce: string,
    public readonly codeVerifier: string,
    public readonly redirectId: string
  ) {
  }

  public static c(plain: Record<string, any>): R<OpenIdAuthRequestData> {
    if (!plain?.state || !plain?.nonce || !plain?.codeVerifier) {
      return ERR(OpenIdAuthRequestDataCreateError, AppErrorCode.INTERNAL_ERROR, {
        stateMissing: !plain?.state,
        nonceMissing: !plain?.nonce,
        codeVerifierMissing: !plain?.codeVerifier,
        redirectId: !plain?.redirectId,
      });
    }
    return OK(new OpenIdAuthRequestData(plain.state, plain.nonce, plain.codeVerifier, plain.redirectId));
  }

  public toJSON(): Record<string, any> {
    return {
      state: this.state,
      nonce: this.nonce,
      codeVerifier: this.codeVerifier,
      redirectId: this.redirectId,
    };
  }
}