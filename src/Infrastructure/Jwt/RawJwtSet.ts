import {  R, Result } from '@hexancore/common';
import { RawJwt } from './RawJwt';

export const JwtValueSetCreateFromPlainError = 'core.infra.auth.jwt.value_set_create_from_plain';

export class RawJwtSet {
  public constructor(public readonly access: RawJwt, public readonly refresh: RawJwt) {}

  public static c(plain: Record<string, any>): R<RawJwtSet> {
    return Result.all(
      {
        access: RawJwt.c(plain?.access ?? ''),
        refresh: RawJwt.c(plain?.refresh ?? ''),
      },
      JwtValueSetCreateFromPlainError,
    ).map((v) => new RawJwtSet(v.access, v.refresh));
  }
}
