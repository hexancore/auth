/**
 * @group integration
 */

import { BasicSessionData } from '@/Infrastructure/Session/Data/BasicSessionData';
import { BasicSessionDataSerializer } from '@/Infrastructure/Session/Data/BasicSessionDataSerializer';
import { Session } from '@/Infrastructure/Session/Session';
import { RedisSessionStore } from '@/Infrastructure/Session/Store/Redis/RedisSessionStore';
import { HcAppRedisModule, APP_REDIS_TOKEN } from '@hexancore/cloud';
import { DateTime } from '@hexancore/common';
import { HcModule } from '@hexancore/core';
import { Duration } from '@js-joda/core';
import { Test, TestingModule } from '@nestjs/testing';
import { type Redis } from 'ioredis';

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
  let redis: Redis;
  let store: RedisSessionStore<BasicSessionData>;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [HcAppRedisModule, HcModule.forRoot({ cls: false, accountContext: { useCls: false } })],
      providers: [
        {
          provide: RedisSessionStore,
          useFactory: (redis: Redis) => {
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
