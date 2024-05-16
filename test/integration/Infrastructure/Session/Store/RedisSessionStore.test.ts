/**
 * @group integration
 */

import { RedisSessionStoreProvider, SESSION_STORE_TOKEN } from '@';
import { Session } from '@/Infrastructure/Session/Session';
import { RedisSessionStore } from '@/Infrastructure/Session/Store/Redis/RedisSessionStore';
import { APP_REDIS_TOKEN, HcAppRedisModule } from '@hexancore/cloud';
import { DateTime, LogicError } from '@hexancore/common';
import { HcModule } from '@hexancore/core';
import { Duration } from '@js-joda/core';
import { Test, TestingModule } from '@nestjs/testing';
import { TestSessionData } from '@testhelper/Infrastructure/Session/TestSessionData';
import { type Redis } from 'ioredis';

function createTestSessionData() {
  const data = TestSessionData.c({
    field: "test",
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
  let store: RedisSessionStore<TestSessionData>;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [HcAppRedisModule, HcModule.forRoot({})],
      providers: [
        RedisSessionStoreProvider(TestSessionData.c)
      ],
    }).compile();
    module.enableShutdownHooks();
    await module.init();
    redis = module.get(APP_REDIS_TOKEN);
    store = module.get(SESSION_STORE_TOKEN);
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

      const r = await store.save(session);

      expect(r.isSuccess()).toBeTruthy();
      const current = await store.get(session.id);
      session.forceRenewCookie = false;
      expect(current.v).toEqual(session);
      const currentTTL = await redis.ttl('core:auth:sessions:' + session.id);
      expect(currentTTL).toBeLessThanOrEqual(sessionTTL.seconds());
    });

    test('when persist marked to terminate, then error', async () => {
      const sessionTTL = Duration.ofMinutes(2);
      const session = createTestSession(sessionTTL);
      session.markToTerminate();

      const r = await store.save(session);

      expect(r.isError()).toBeTruthy();
      expect(r.e.error).toMatchObject(new LogicError('Persisting terminated or to terminate session forbidden'));
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
      await store.save(session);

      const deleteResult = await store.delete(session.id);

      expect(deleteResult.isSuccess()).toBeTruthy();
      const current = await redis.exists('core:auth:sessions:' + session.id);
      expect(current).toBeFalsy();
    });
  });
});
