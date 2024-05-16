import { AR, ARW, AppErrorCode, DateTime, INTERNAL_ERRA, LogicError } from '@hexancore/common';
import type { Cluster, Redis } from 'ioredis';
import { SessionData } from '../../Data/SessionData';
import { SessionDataSerializer } from '../../Data/SessionDataSerializer';
import { Session } from '../../Session';
import { SessionState } from '../../SessionState';
import { SessionStore } from '../SessionStore';

type RedisOrCluster = Redis | Cluster;

const RedisSessionStoreErrorType = 'core.auth.session.store.redis';

export class RedisSessionStore<D extends SessionData> implements SessionStore<D> {
  public constructor(
    protected redis: RedisOrCluster,
    protected serializer: SessionDataSerializer<D>,
    protected keyPrefix = 'core:auth:session:'
  ) { }

  public get(id: string): AR<Session<D> | null> {
    const key = this.getKey(id);
    return this.wrapCommandResult(this.redis.get(key)).onOk((v) => {
      if (!v) {
        return null;
      }

      return this.parseValue(id, v);
    });
  }

  public save(session: Session<D>): AR<boolean> {
    if (session.isTerminated() || session.isToTerminate()) {
      return INTERNAL_ERRA(new LogicError("Persisting terminated or to terminate session forbidden"));
    }

    const key = this.getKey(session.id);

    const plain = {
      createdAt: session.createdAt,
      expireAt: session.expireAt,
      data: this.serializer.serialize(session.data).v,
    };

    const redisCommand = this.redis.pipeline()
      .set(key, JSON.stringify(plain))
      .expireat(key, session.expireAt.t);

    const groupId = session.data.sessionGroupId;
    if (groupId) {
      const groupKey = this.getGroupKey(groupId);
      if (session.needRegisterInSessionGroup) {
        redisCommand.sadd(groupKey, session.id);
      }

      redisCommand.expireat(key, session.expireAt.t);
    }

    return this.wrapCommandResult(redisCommand.exec()).onOk(() => {
      session.state = SessionState.ACTIVE;
      session.needRegisterInSessionGroup = false;
      session.data.__track();
      return true;
    });
  }

  public delete(id: string, groupId?: string): AR<boolean> {
    const key = this.getKey(id);
    if (groupId) {
      return this.wrapCommandResult(this.redis.pipeline().del(key).srem(this.getGroupKey(groupId), id).exec()).mapToTrue();
    }

    return this.wrapCommandResult(this.redis.del(key)).mapToTrue();
  }

  public getInGroup(groupId: string): AR<Session<D>[]> {
    return this.getIdsInGroup(groupId).onOk((ids) => {
      return this.wrapCommandResult(this.redis.mget(ids))
        .onOk((values) => ids.map(id => values[id] ? this.parseValue(id, values[id]) : null).filter(s => s !== null));
    });
  }

  public getIdsInGroup(groupId: string): AR<string[]> {
    return this.wrapCommandResult(this.redis.smembers(this.getGroupKey(groupId)));
  }

  public deleteGroup(groupId: string): AR<boolean> {
    return this.getIdsInGroup(groupId).onOk((ids) => {
      const keys = ids.map(i => this.getKey(i));
      keys.push(this.getGroupKey(groupId));
      return this.redis.del(keys);
    }).mapToTrue();
  }

  protected getKey(id: string | string[]): string {
    return this.keyPrefix + "s:" + id;
  }

  protected getGroupKey(groupId: string): string {
    return this.keyPrefix + "sg:" + groupId;
  }

  protected parseValue(id: string, value: string): Session<D> {
    const parsed = JSON.parse(value);
    const s = new Session<D>(id, SessionState.ACTIVE);
    s.createdAt = DateTime.c(parsed.createdAt).v;
    s.expireAt = DateTime.c(parsed.expireAt).v;
    s.data = this.serializer.deserialize(parsed.data).v;
    s.data.__track();

    return s;
  }

  protected wrapCommandResult<T>(command: Promise<T>): AR<T> {
    return ARW(command, (e: Error) => ({
      type: RedisSessionStoreErrorType,
      error: e,
      message: e.message,
      code: AppErrorCode.INTERNAL_ERROR,
    }));
  }
}
