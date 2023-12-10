/**
 * @group integration
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Cluster } from 'ioredis';
import { RedisSessionStore } from '@/Infrastructure/Session/Store/RedisSessionStore';
import { BasicSessionData, BasicSessionUser } from '@/Infrastructure/Session/Data/BasicSessionData';
import { BasicSessionDataSerializer } from '@/Infrastructure/Session/Data/BasicSessionDataSerializer';
import { APP_REDIS_TOKEN, AppConfigModule, AppRedisModule } from '@hexancore/core';
import { Session } from '@/Infrastructure/Session/Session';
import { DateTime, OK } from '@hexancore/common';
import { RawJwt, RawJwtSet } from '@';
import { Duration, Period } from '@js-joda/core';

function createTestSessionData() {
  const data = BasicSessionData.c({
    auth: {
      access: {
        value: 'test_access',
        expireAt: '2023-11-01T10:00:00',
      },
      refresh: {
        value: 'test_refresh',
        expireAt: '2023-11-10T10:00:00',
      },
    },
    user: {
      id: 'test',
      roles: [1, 2, 3],
    },
  });

  return data.v;
}

function createTestSession(ttl: Duration) {
  const createdAt = DateTime.now();
  const sessionData = createTestSessionData();
  return Session.createNew(sessionData, createdAt, createdAt.plus(ttl));
}

describe('RedisSessionStore', () => {
  let module: TestingModule;
  let redis: Cluster;
  let store: RedisSessionStore<BasicSessionData>;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [AppConfigModule, AppRedisModule],
      providers: [
        {
          provide: RedisSessionStore,
          useFactory: (redis) => {
            const serializer = new BasicSessionDataSerializer();
            return new RedisSessionStore(redis, serializer);
          },
          inject: [APP_REDIS_TOKEN],
        },
      ],
    }).compile();
    module.enableShutdownHooks();
    await module.init();
    redis = module.get(APP_REDIS_TOKEN);
    store = module.get(RedisSessionStore);
  });

  afterAll(async () => {
    if (module) {
      redis = null;
      await module.close();
      module = null;
    }
  });

  describe('persistance', () => {
    test('when persist new, then in redis hash with ttl', async () => {
      const sessionTTL = Duration.ofMinutes(2);
      const session = createTestSession(sessionTTL);

      const r = await store.persist(session);

      expect(r.isSuccess()).toBeTruthy();
      const current = await store.get(session.id);
      expect(current.v).toEqual(session);
      const currentTTL = await redis.ttl('core:auth:sessions:' + session.id);
      expect(currentTTL).toBeLessThanOrEqual(sessionTTL.seconds());
    });

    test('when persist marked to delete, then error', async () => {
      const sessionTTL = Duration.ofMinutes(2);
      const session = createTestSession(sessionTTL);
      session.markToDelete();

      const r = await store.persist(session);

      expect(r.isSuccess()).toBeTruthy();
    });
  });

  describe('get', () => {
    test('when not exists, then return null', async () => {
      const current = await store.get('v16lL84RsjtXvfqzy3vkIz6');

      expect(current.v).toEqual(null);
    });
  });

  describe('delete', () => {
    test('when exists, then key deleted from redis', async () => {
      const sessionTTL = Duration.ofMinutes(2);
      const session = createTestSession(sessionTTL);
      await store.persist(session);

      const deleteResult = await store.delete(session.id);

      expect(deleteResult.isSuccess()).toBeTruthy();
      const current = await redis.exists('core:auth:sessions:' + session.id);
      expect(current).toBeFalsy();
    });
  });
});
