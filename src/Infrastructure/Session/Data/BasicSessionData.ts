import { AccountId, OK, R, Result, UserId } from '@hexancore/common';
import { RawJwtSet } from '../../Jwt/RawJwtSet';
import { SessionData } from './SessionData';

export const BasicSessionUserCreateFromPlainError = 'core.auth.session.data.basic_user.create_from_plain';

export class BasicSessionUser {
  public constructor(public readonly id: UserId, public accountId?: AccountId) {}

  public static c(plain: Record<string, any>): R<BasicSessionUser> {
    return Result.all(
      {
        userId: UserId.c(plain?.id),
        accountId: plain?.accountId > 0 ? AccountId.c(plain?.accountId) : OK(null),
      },
      BasicSessionUserCreateFromPlainError,
    ).map(({ userId, accountId }) => new BasicSessionUser(userId, accountId));
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
