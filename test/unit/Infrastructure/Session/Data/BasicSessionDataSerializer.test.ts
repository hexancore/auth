/**
 * @group unit
 */

import { BasicSessionData, BasicSessionDataSerializer, BasicSessionUser, RawJwt, RawJwtSet } from '@';
import { SessionDataSerializerErrors } from '@/Infrastructure/Session/Data/SessionDataSerializer';
import { DateTime, AccountId, UserId } from '@hexancore/common';

describe(BasicSessionDataSerializer.constructor.name, () => {
  let serializer: BasicSessionDataSerializer;

  beforeEach(() => {
    serializer = new BasicSessionDataSerializer();
  });

  describe('serialize', () => {
    test('should return serialized', async () => {
      const data = new BasicSessionData(
        new RawJwtSet(new RawJwt('test_access', DateTime.cs('2023-11-01T10:00:00')), new RawJwt('test_refresh', DateTime.cs('2023-11-01T11:00:00'))),
        new BasicSessionUser(UserId.cs('test_user_id'),AccountId.cs("10")),
      );
      const current = serializer.serialize(data);

      expect(current.v).toEqual({
        auth: new RawJwtSet(new RawJwt('test_access', DateTime.cs('2023-11-01T10:00:00')), new RawJwt('test_refresh', DateTime.cs('2023-11-01T11:00:00'))),
        user: new BasicSessionUser(UserId.cs('test_user_id'),AccountId.cs("10")),
      });
    });
  });

  describe('deserialize', () => {
    test('when valid plain, should return SessionData instance', async () => {
      const plain = {
        auth: {
          access: {
            value: 'test_access',
            expireAt: DateTime.cs('2023-11-01T10:00:00').t,
          },
          refresh: {
            value: 'test_refresh',
            expireAt: DateTime.cs('2023-11-01T11:00:00').t,
          },
        },
        user: {
          id: 'test_user_id',
          accountId: "10",
        },
      };

      const current = serializer.deserialize(plain);

      const expected = new BasicSessionData(
        new RawJwtSet(new RawJwt('test_access', DateTime.cs('2023-11-01T10:00:00')), new RawJwt('test_refresh', DateTime.cs('2023-11-01T11:00:00'))),
        new BasicSessionUser(UserId.cs('test_user_id'),AccountId.cs("10")),
      );
      expect(current.v).toEqual(expected);
    });

    test('when invalid plain, should return error', async () => {
      const plain = {
        auth: {
          access: {
            value: 'test_access',
          },
          refresh: {
            value: 'test_refresh',
            expireAt: DateTime.cs('2023-11-01T11:00:00').t,
          },
        },
        user: {
          id: 'test_user_id',
          accountId: "10"
        },
      };

      const current = serializer.deserialize(plain);


      expect(current).toMatchAppError({type: SessionDataSerializerErrors.deserialize});
    });
  });
});
