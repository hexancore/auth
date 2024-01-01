import { DateTime, ERR, OK, P, R } from '@hexancore/common';

export const JwtValueCreateFromPlainError = 'core.infra.auth.jwt.value_create_from_plain';
export class RawJwt {
  public constructor(public readonly value: string, public readonly expireAt: DateTime) {}

  public static c(plain: { value: string; expireAt: number }): R<RawJwt> {
    const value = String(plain?.value ?? '');
    const expireAtResult = DateTime.c(plain?.expireAt ?? -1);

    if (value.length === 0 || expireAtResult.isError()) {
      return ERR(JwtValueCreateFromPlainError, 400, {
        value: value.length === 0 ? '<empty>' : null,
        expireAt: expireAtResult.e,
      });
    }

    return OK(new RawJwt(value, expireAtResult.v));
  }
}
