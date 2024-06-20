import { DateTime, ERR, OK, P, R } from '@hexancore/common';
import * as jose from 'jose';

export const JwtValueCreateFromPlainError = 'core.infra.auth.jwt.value_create_from_plain';
export const JwtDecodeError = 'core.infra.auth.jwt.decode';

export class Jwt {
  public constructor(
    public readonly value: string,
    public readonly expireAt: DateTime
  ) { }

  public static c(plain: { value: string; expireAt: number } | string): R<Jwt> {
    if (typeof plain === 'string') {
      return this.decodeToken(plain).onOk((p) => {
        return Jwt.c({ value: plain, expireAt: p.exp ?? 0 });
      });
    }

    const value = String(plain?.value ?? '');
    const expireAtResult = DateTime.c(plain?.expireAt ?? -1);

    if (value.length === 0 || expireAtResult.isError()) {
      return ERR(JwtValueCreateFromPlainError, 400, {
        value: value.length === 0 ? '<empty>' : null,
        expireAt: expireAtResult.e,
      });
    }

    return OK(new Jwt(value, expireAtResult.v));
  }

  public getPayload(): R<jose.JWTPayload> {
    return Jwt.decodeToken(this.value);
  }

  public static decodeToken(token: string): R<jose.JWTPayload> {
    try {
      return jose.decodeJwt(token);
    } catch (e) {
      return ERR({type: JwtDecodeError, code: 400, error: e as any});
    }
  }
}
