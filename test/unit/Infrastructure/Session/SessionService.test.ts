/**
 * @group unit
 */

import { MemorySessionStore, PlainSessionDataSerializer, SessionService, SessionState, type SessionStore } from '@';
import { CurrentTime, DateTime } from '@hexancore/common';
import { TestSessionData } from '@testhelper/Infrastructure/Session/TestSessionData';

describe(SessionService.constructor.name, () => {
  const ct: CurrentTime = new CurrentTime();
  let store: SessionStore<TestSessionData>;
  let service: SessionService<TestSessionData>;

  beforeEach(() => {
    ct.now = DateTime.cs('2024-05-12T10:00:00');
    const dataSerializer = new PlainSessionDataSerializer(TestSessionData.c);
    store = new MemorySessionStore(dataSerializer, ct);
    service = new SessionService(ct, store, '10m');
  });

  describe('create', () => {
    test('should create', async () => {
      const data = new TestSessionData('test');

      const current = service.create(data);
      expect(current.data).toBe(data);
      expect(current.createdAt!.formatDateTime()).toBe('2024-05-12T10:00:00');
      expect(current.expireAt!.formatDateTime()).toBe('2024-05-12T10:10:00');
      expect(current.state).toBe(SessionState.NEW);
      expect(current.needRenewCookie).toBe(true);
      expect(current.needSave).toBe(true);
    });
  });

  describe('save', () => {
    test('when new session', async () => {
      const data = new TestSessionData('test');
      const session = service.create(data);

      const current = await service.save(session);

      expect(current).toMatchSuccessResult(true);
      expect(session.data!.__tracked).toBeTruthy();
      expect(session.data!.__modified).toBeFalsy();
      expect(session.state).toBe(SessionState.ACTIVE);
      expect(session.needSave).toBe(false);
    });

    test('when session is active and changed data', async () => {
      const data = new TestSessionData('test');
      const session = service.create(data);
      session.markAsActive();
      session.data!.__track();

      session.data!.field = 'test_changed';

      const current = await service.save(session);

      expect(current).toMatchSuccessResult(true);
      expect(session.data!.__modified).toBeFalsy();
      expect(session.needSave).toBe(false);
    });

    test('when session is active and data not changed', async () => {
      const data = new TestSessionData('test');
      const session = service.create(data);
      session.markAsActive();
      session.data!.__track();

      const current = await service.save(session);

      expect(current).toMatchSuccessResult(true);
      expect(session.needSave).toBe(false);
      expect(await store.get(session.id)).toMatchSuccessResult(null);
    });
  });
});
