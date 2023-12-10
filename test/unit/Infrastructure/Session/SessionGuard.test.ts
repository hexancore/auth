/**
 * @group unit
 */

import { Session, SessionData, SessionGuard } from '@';
import { DateTime } from '@hexancore/common';
import { ExecutionContextTestHelper, MockHttpExecutionContext } from '@hexancore/core/testutil';
import { UnauthorizedException } from '@nestjs/common';

describe(SessionGuard.constructor.name, () => {
  let guard: SessionGuard;
  let context: MockHttpExecutionContext;
  let session: Session<any>;

  beforeEach(() => {
    guard = new SessionGuard('SID');
    context = ExecutionContextTestHelper.createHttp();
    session = Session.createNew({} as SessionData, DateTime.cs('2023-11-01T10:00:00'), DateTime.cs('2023-11-01T11:00:00'));
  });

  describe('canActivate', () => {
    test('when session exists on request and is not deleted, then Authorized', async () => {
      context.request['session'] = session;

      const current = guard.canActivate(context);

      expect(current).toBeTruthy();
    });

    test('when session exists on request and is marked to delete, then clear cookie and Unauthorized', async () => {
      context.request['session'] = session;
      session.markToDelete();

      expect(() => guard.canActivate(context)).toThrowError(new UnauthorizedException());
      expect('SID' in context.response.clearedCookies).toBeTruthy();
    });

    test('when session not exists on request, then Unauthorized', async () => {
      expect(() => guard.canActivate(context)).toThrowError(new UnauthorizedException());
    });
  });
});
