/**
 * @group unit
 */

import { Session, SessionData, SessionService } from '@';
import { SessionMiddleware } from '@/Infrastructure/Session/SessionMiddleware';
import { DateTime, OKA } from '@hexancore/common';
import { ExecutionContextTestHelper, MockHttpExecutionContext } from '@hexancore/core/testutil';
import { M, Mocker } from '@hexancore/mocker';
import { request } from 'http';

describe(SessionMiddleware.constructor.name, () => {
  let service: M<SessionService<any>>;
  let middleware: SessionMiddleware;

  let session: Session<any>;
  let context: MockHttpExecutionContext;
  let next: jest.Mock;

  beforeEach(() => {
    service = Mocker.of('SessionService');
    middleware = new SessionMiddleware('SID', service.i);

    session = Session.createNew({} as SessionData, DateTime.cs('2023-11-01T10:00:00'), DateTime.cs('2023-11-01T11:00:00'));

    context = ExecutionContextTestHelper.createHttp();
    next = jest.fn();
  });

  afterEach(() => {
    service.checkExpections();
  });

  describe('use', () => {
    test('when valid id in cookie and session exists, then set in request', async () => {
      context.request.cookies['SID'] = session.id;

      service.expects('get', session.id).andReturn(OKA(session));

      const result = await middleware.use(context.getRequest(), context.getResponse(), next);

      expect(next).toBeCalledTimes(1);
      expect(result.isSuccess()).toBeTruthy();
      expect(context.request['session']).toBe(session);
    });

    test('when invalid id in cookie', async () => {
      context.request.cookies['SID'] = 'not_valid';

      await middleware.use(context.getRequest(), context.getResponse(), next);

      expect(next).toBeCalledTimes(1);
    });

    test('when no cookie', async () => {
      await middleware.use(context.getRequest(), context.getResponse(), next);

      expect(next).toBeCalledTimes(1);
    });
  });
});
