/**
 * @group unit
 */

import { PlainSessionDataSerializer } from '@';
import { SessionDataSerializerErrors } from '@/Infrastructure/Session/Data/SessionDataSerializer';
import { TestSessionData } from '@testhelper/Infrastructure/Session/TestSessionData';

describe(PlainSessionDataSerializer.constructor.name, () => {
  let serializer: PlainSessionDataSerializer<TestSessionData>;

  beforeEach(() => {
    serializer = new PlainSessionDataSerializer(TestSessionData.c);
  });

  describe('serialize', () => {
    test('should return serialized', async () => {
      const data = new TestSessionData('test');
      const current = serializer.serialize(data);

      expect(current.v).toEqual({ field: 'test', auth: false, groupId: undefined });
    });
  });

  describe('deserialize', () => {
    test('when valid plain, should return SessionData instance', async () => {
      const plain = { field: 'test' };

      const current = serializer.deserialize(plain);

      const expected = new TestSessionData('test');
      expect(current.v).toEqual(expected);
    });

    test('when invalid plain, should return error', async () => {
      const plain = {
        invalid: 'test',
      };

      const current = serializer.deserialize(plain);
      expect(current).toMatchAppError({ type: SessionDataSerializerErrors.deserialize });
    });
  });
});
