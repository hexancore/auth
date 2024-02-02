import { Cluster } from 'ioredis';
import { SessionStore } from './SessionStore';
import { SessionData } from '../Data/SessionData';
import { AR, ARW, ARWB, DateTime, OK, P, PB } from '@hexancore/common';
import { Session } from '../Session';
import { SessionState } from '../SessionState';
import { SessionDataSerializer } from '../Data/SessionDataSerializer';

const SESSION_FIELD = 'session';

export class RedisSessionStore<D extends SessionData> implements SessionStore<D> {
  public constructor(protected redis: Cluster, protected serializer: SessionDataSerializer<D>, protected keyPrefix = 'core:auth:sessions:') {}

  public get(id: string): AR<Session<D> | null> {
    const key = this.getKey(id);
    return ARW(this.redis.hget(key, 'session')).onOk((v) => {
      if (!v) {
        return null;
      }

      const parsed = JSON.parse(v);

      const s = new Session<D>(id, SessionState.ACTIVE);
      s.createdAt = DateTime.c(parsed.createdAt).v;
      s.expireAt = DateTime.c(parsed.expireAt).v;
      s.data = this.serializer.deserialize(parsed.data).v;
      s.data.__track();

      return s;
    });
  }

  public persist(session: Session<D>): AR<boolean> {
    const key = this.getKey(session.id);

    const plain = {
      createdAt: session.createdAt,
      expireAt: session.expireAt,
      data: this.serializer.serialize(session.data).v,
    };

    const redisCommand = this.redis.pipeline().hset(key, SESSION_FIELD, JSON.stringify(plain)).expireat(key, session.expireAt.t);
    return ARW(redisCommand.exec()).onOk(() => {
      session.state = SessionState.ACTIVE;
      session.data.__track();
      return OK(true);
    });
  }

  public delete(id: string): AR<boolean> {
    const key = this.getKey(id);
    return ARW(this.redis.del(key)).mapToTrue();
  }

  protected getKey(id: string): string {
    return this.keyPrefix + id;
  }
}
