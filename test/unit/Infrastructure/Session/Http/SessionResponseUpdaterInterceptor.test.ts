/**
 * @group unit
 */

import { Session, SessionData, SessionResponseUpdaterInterceptor, type HttpSessionService } from '@';
import { DateTime, ERR, ERRA, OK, OKA } from '@hexancore/common';
import { ExecutionContextTestHelper, MockHttpExecutionContext } from '@hexancore/core/testing';
import { M, mock } from '@hexancore/mocker';

describe(SessionResponseUpdaterInterceptor.constructor.name, () => {
  let service: M<HttpSessionService>;
  let interceptor: SessionResponseUpdaterInterceptor;

  let session: Session<any>;
  let context: MockHttpExecutionContext;

  beforeEach(() => {
    service = mock('SessionService');
    interceptor = new SessionResponseUpdaterInterceptor(service.i);

    session = Session.createNew({} as SessionData, DateTime.cs('2023-11-01T10:00:00'), DateTime.cs('2023-11-01T11:00:00'));
    context = ExecutionContextTestHelper.createHttp();
  });

  afterEach(() => {
    service.checkExpections();
  });

  describe('afterRoute', () => {
    test('when no session on request', async () => {

      const result = await interceptor.afterRoute(context, OK('data'));

      expect(result).toMatchSuccessResult('data');
    });

    test('when session on request and data is Result', async () => {
      context.request!['session'] = session;

      service.expects('updateResponse', session, context.response as any).andReturn(OKA(true));

      const result = await interceptor.afterRoute(context, OK('data'));

      expect(result).toMatchSuccessResult('data');
    });

    test('when session on request and data is error Result', async () => {
      context.request!['session'] = session;

      service.expects('updateResponse', session, context.response as any).andReturn(OKA(true));

      const result = await interceptor.afterRoute(context, ERR('test'));

      expect(result).toMatchAppError({ type: 'test' });
    });

    test('when session on request and data is AsyncResult, then persist', async () => {
      context.request!['session'] = session;

      service.expects('updateResponse', session, context.response as any).andReturn(OKA(true));

      const result = await interceptor.afterRoute(context, OKA('data'));

      expect(result).toMatchSuccessResult('data');
    });

    test('when not marked to delete and data is error AsyncResult, then persist', async () => {
      context.request!['session'] = session;

      service.expects('updateResponse', session, context.response as any).andReturn(OKA(true));

      const result = await interceptor.afterRoute(context, ERRA('test'));

      expect(result).toMatchAppError({ type: 'test' });
    });
  });
});
