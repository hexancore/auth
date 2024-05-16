/**
 * @group unit
 */

import { Session, SessionGuard, SessionState } from '@';
import { DateTime } from '@hexancore/common';
import { ExecutionContextTestHelper, MockHttpExecutionContext } from '@hexancore/core/testutil';
import { UnauthorizedException } from '@nestjs/common';
import { TestSessionData } from '@testhelper/Infrastructure/Session/TestSessionData';

describe(SessionGuard.constructor.name, () => {
  let guard: SessionGuard;
  let context: MockHttpExecutionContext;
  let session: Session<any>;

  beforeEach(() => {
    guard = new SessionGuard();
    context = ExecutionContextTestHelper.createHttp();
    session = Session.createNew(
      new TestSessionData('test'),
      DateTime.cs('2023-11-01T10:00:00'),
      DateTime.cs('2023-11-01T11:00:00')
    );
  });

  describe('canActivate', () => {
    test('when session exists on request and is Active, then Authorized', async () => {
      context.request['session'] = session;
      session.state = SessionState.ACTIVE;

      const current = guard.canActivate(context);

      expect(current).toBeTruthy();
    });

    test('when session exists on request and is marked to terminate, then Unauthorized', async () => {
      context.request['session'] = session;
      session.markToTerminate();

      expect(() => guard.canActivate(context)).toThrowError(new UnauthorizedException());
    });

    test('when session exists on request and is marked as terminated, then Unauthorized', async () => {
      context.request['session'] = session;
      session.terminate();

      expect(() => guard.canActivate(context)).toThrowError(new UnauthorizedException());
    });

    test('when session not exists on request, then Unauthorized', async () => {
      expect(() => guard.canActivate(context)).toThrowError(new UnauthorizedException());
    });
  });
});
