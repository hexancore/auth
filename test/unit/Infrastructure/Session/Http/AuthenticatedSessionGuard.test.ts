/**
 * @group unit
 */

import { AuthenticatedSessionGuard, Session, SessionGuard, SessionState } from '@';
import { DateTime } from '@hexancore/common';
import { ExecutionContextTestHelper, MockHttpExecutionContext } from '@hexancore/core/testutil';
import { UnauthorizedException } from '@nestjs/common';
import { TestSessionData } from '@testhelper/Infrastructure/Session/TestSessionData';

describe(AuthenticatedSessionGuard.constructor.name, () => {
  let guard: AuthenticatedSessionGuard;
  let context: MockHttpExecutionContext;
  let session: Session<TestSessionData>;

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
    test('when session exists on request and is Authenticated, then Authorized', async () => {
      context.request['session'] = session;
      session.state = SessionState.ACTIVE;
      session.data.auth = true;

      const current = guard.canActivate(context);

      expect(current).toBeTruthy();
    });

    test('when session exists on request and is not active, then Unauthorized', async () => {
      context.request['session'] = session;
      session.markToTerminate();

      expect(() => guard.canActivate(context)).toThrowError(new UnauthorizedException());
    });

    test('when session not exists on request, then Unauthorized', async () => {
      expect(() => guard.canActivate(context)).toThrowError(new UnauthorizedException());
    });
  });
});
