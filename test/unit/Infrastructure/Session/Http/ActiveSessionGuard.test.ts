/**
 * @group unit
 */

import { HttpSessionService, Session, ActiveSessionGuard} from '@';
import { DateTime, ERRA, INTERNAL_ERROR, OKA } from '@hexancore/common';
import { ExecutionContextTestHelper, MockHttpExecutionContext } from '@hexancore/core/testing/http';
import { type M, mock } from '@hexancore/mocker';
import { UnauthorizedException } from '@nestjs/common';
import { TestSessionData } from '@testhelper/Infrastructure/Session/TestSessionData';

describe(ActiveSessionGuard.constructor.name, () => {
  let service: M<HttpSessionService>;
  let guard: ActiveSessionGuard;
  let context: MockHttpExecutionContext;
  let session: Session<any>;

  beforeEach(() => {
    service = mock(HttpSessionService.name);
    guard = new ActiveSessionGuard(service.i);
    context = ExecutionContextTestHelper.createHttp();
    session = Session.createNew(
      new TestSessionData('test'),
      DateTime.cs('2023-11-01T10:00:00'),
      DateTime.cs('2023-11-01T11:00:00')
    );
  });

  describe('canActivate', () => {
    test('when session exists on request and is Active, then Authorized', async () => {
      service.expects('tryLoadToRequest', context.getRequest() as any).andReturnWith((req) => {
        req.session = session;
        session.markAsActive();
        return OKA(true) as any;
      });

      const current = await guard.canActivate(context);

      expect(current).toBeTruthy();
    });

    test('when no session on request, then Unauthorized', async () => {
      service.expects('tryLoadToRequest', context.getRequest() as any).andReturnWith(() => {
        return OKA(true) as any;
      });

      expect(guard.canActivate(context)).rejects.toEqual(new UnauthorizedException());
    });

    test('when session exists on request and is marked to terminate, then Unauthorized', async () => {
      service.expects('tryLoadToRequest', context.getRequest() as any).andReturnWith((req) => {
        req.session = session;
        session.markToTerminate();
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

    test('when loading to request error, then Unauthorized', async () => {
      const expectedError = INTERNAL_ERROR(new Error("test"));
      service.expects('tryLoadToRequest', context.getRequest() as any).andReturnWith(() => {
        return ERRA(expectedError);
      });

      expect(guard.canActivate(context)).rejects.toEqual(new UnauthorizedException(expectedError));
    });
  });
});
