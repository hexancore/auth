
/**
 * @group unit
 */

import { AuthenticatedSessionGuard, HttpSessionService, Session } from '@';
import { DateTime, OKA } from '@hexancore/common';
import { ExecutionContextTestHelper, MockHttpExecutionContext } from '@hexancore/core/testing/http';
import { mock, type M } from '@hexancore/mocker';
import { UnauthorizedException } from '@nestjs/common';
import { TestSessionData } from '@testhelper/Infrastructure/Session/TestSessionData';

describe(AuthenticatedSessionGuard.constructor.name, () => {
  let service: M<HttpSessionService>;
  let guard: AuthenticatedSessionGuard;
  let context: MockHttpExecutionContext;
  let session: Session<TestSessionData>;

  beforeEach(() => {
    service = mock(HttpSessionService.name);
    guard = new AuthenticatedSessionGuard(service.i);
    context = ExecutionContextTestHelper.createHttp();
    session = Session.createNew(
      new TestSessionData('test'),
      DateTime.cs('2023-11-01T10:00:00'),
      DateTime.cs('2023-11-01T11:00:00')
    );
  });

  afterEach(() => {
    service.checkExpections();
  });

  describe('canActivate', () => {
    test('when session exists on request and is Authenticated, then Authorized', async () => {
      service.expects('tryLoadToRequest', context.getRequest() as any).andReturnWith((req) => {
        req.session = session;
        session.markAsActive();
        session.data = new TestSessionData("test", true);
        return OKA(true) as any;
      });

      const current = await guard.canActivate(context);

      expect(current).toBeTruthy();
    });

    test('when active session exists on request and is not Authenticated, then Unauthorized', async () => {
      service.expects('tryLoadToRequest', context.getRequest() as any).andReturnWith((req) => {
        req.session = session;
        session.markAsActive();
        return OKA(true) as any;
      });

      expect(guard.canActivate(context)).rejects.toEqual(new UnauthorizedException());
    });

    test('when session exists on request and is not active, then Unauthorized', async () => {
      service.expects('tryLoadToRequest', context.getRequest() as any).andReturnWith((req) => {
        req.session = session;
        session.markToTerminate();
        return OKA(true);
      });

      expect(guard.canActivate(context)).rejects.toEqual(new UnauthorizedException());
    });

    test('when session not exists on request, then Unauthorized', async () => {
      service.expects('tryLoadToRequest', context.getRequest() as any).andReturnWith(() => {
        return OKA(true) as any;
      });

      expect(guard.canActivate(context)).rejects.toEqual(new UnauthorizedException());
    });

    test('when session exists on request and is terminated, then Unauthorized', async () => {
      service.expects('tryLoadToRequest', context.getRequest() as any).andReturnWith((req) => {
        req.session = session;
        session.terminate();
        return OKA(true) as any;
      });

      expect(guard.canActivate(context)).rejects.toEqual(new UnauthorizedException());
    });
  });
});
