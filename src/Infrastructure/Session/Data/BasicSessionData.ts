import { DateTime, Email, OK, R, Result } from '@hexancore/common';
import { SessionData } from './SessionData';
import { RawJwtSet } from '../../Jwt/RawJwtSet';

export class BasicSessionUser {
  public constructor(public readonly id: string, public readonly roles: number[]) {}

  public static c(plain: Record<string, any>): R<BasicSessionUser> {
    const id = String(plain?.id ?? '');
    const roles = Array.isArray(plain?.roles) ? plain.roles : [];

    return OK(
      new BasicSessionUser(
        id,
        roles.filter((v) => Number.isInteger(v)),
      ),
    );
  }
}

export const BasicSessionDataCreateFromPlainError = 'core.auth.session.data.basic.create_from_plain';

export class BasicSessionData extends SessionData {
  public constructor(public auth: RawJwtSet, public user: BasicSessionUser) {
    super();
    return this.proxify();
  }

  public static c(plain: Record<string, any>): R<BasicSessionData> {
    return Result.all(
      {
        auth: RawJwtSet.c(plain?.auth),
        user: BasicSessionUser.c(plain?.user),
      },
      BasicSessionDataCreateFromPlainError,
    ).map((v) => {
      return new BasicSessionData(v.auth, v.user);
    });
  }

  public toJSON(): Record<string, any> {
    return {
      auth: this.auth,
      user: this.user,
    };
  }
}
