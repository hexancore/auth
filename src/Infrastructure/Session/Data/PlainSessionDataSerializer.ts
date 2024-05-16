import { AppErrorCode, ERR, OK, R } from '@hexancore/common';
import { SessionDataSerializer, SessionDataSerializerErrors } from './SessionDataSerializer';
import type { SessionData } from './SessionData';

export type FromPlainFactory<T> = (plain: any) => R<T>;

export class PlainSessionDataSerializer<T extends SessionData> implements SessionDataSerializer<T> {

  public constructor(private fromPlainFactory: FromPlainFactory<T>) { }

  public serialize(data: T): R<Record<string, any>> {
    return OK(data.toJSON());
  }

  public deserialize(plain: any): R<T> {
    return this.fromPlainFactory(plain)
      .onErr((e) => (ERR({ type: SessionDataSerializerErrors.deserialize, code: AppErrorCode.INTERNAL_ERROR, cause: e })));
  }
}
