/**
 * @group unit
 */

import { Session, SessionData,  type FReqWithSession, type HttpSessionService } from '@';
import { SessionMiddleware } from '@/Infrastructure/Session/Http/SessionMiddleware';
import { AppErrorCode, DateTime, ERRA, OKA, PanicError } from '@hexancore/common';
import { ExecutionContextTestHelper, MockHttpExecutionContext } from '@hexancore/core/testutil';
import { M, Mocker } from '@hexancore/mocker';
import { HttpException } from '@nestjs/common';
import { TestSessionData } from '@testhelper/Infrastructure/Session/TestSessionData';

describe(SessionMiddleware.constructor.name, () => {
  let service: M<HttpSessionService>;
  let middleware: SessionMiddleware;

  let session: Session<any>;
  let context: MockHttpExecutionContext;
  let request: FReqWithSession<any>;
  let nextCalled;
  let next: (error?) => void;

  beforeEach(() => {
    service = Mocker.of('SessionService');
    middleware = new SessionMiddleware(service.i);

    session = Session.createNew(new TestSessionData('test'), DateTime.cs('2023-11-01T10:00:00'), DateTime.cs('2023-11-01T11:00:00'));

    context = ExecutionContextTestHelper.createHttp();
    request = context.switchToHttp().getRequest();

    nextCalled = null;
    next = (error) => {
      nextCalled = {
        error
      };
    };

  });

  afterEach(() => {
    service.checkExpections();
  });

  describe('use', () => {
    test('when loaded', async () => {
      service.expects('tryLoadToRequest', request).andReturn(OKA(true));

      const result = await middleware.use(context.getRequest(), context.getResponse(), next);

      expect(nextCalled).not.toBeNull();
      expect(result.isSuccess()).toBeTruthy();
    });

    test('when loading error', async () => {
      service.expects('tryLoadToRequest', request).andReturn(ERRA('test', AppErrorCode.UNAUTHORIZED));
      await middleware.use(context.getRequest(), context.getResponse(), next);

      expect(nextCalled).not.toBeNull();
      expect(nextCalled.error).toBeInstanceOf(HttpException);
    });

    test('when loading internal error', async () => {
      service.expects('tryLoadToRequest', request).andReturn(ERRA('test', AppErrorCode.INTERNAL_ERROR));
      await middleware.use(context.getRequest(), context.getResponse(), next);

      expect(nextCalled).not.toBeNull();
      expect(nextCalled.error).toBeInstanceOf(PanicError);
    });
  });
});
