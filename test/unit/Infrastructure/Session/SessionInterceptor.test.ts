/**
 * @group unit
 */

import { Session, SessionCookieOptions, SessionData, SessionInterceptor, SessionService } from '@';
import { M, Mocker } from '@hexancore/mocker';
import { ExecutionContextTestHelper, MockHttpExecutionContext, MockResponse } from '@hexancore/core/testutil';
import { firstValueFrom, of } from 'rxjs';
import { DateTime, ERR, ERRA, OK, OKA } from '@hexancore/common';

describe(SessionInterceptor.constructor.name, () => {
  const cookieOptions: SessionCookieOptions = {
    name: 'SID',
    httpOnly: true,
    secure: true,
    sameSite: true,
    domain: '',
    path: '',
  };
  let service: M<SessionService<any>>;
  let interceptor: SessionInterceptor;

  let session: Session<any>;
  let context: MockHttpExecutionContext;

  beforeEach(() => {
    service = Mocker.of('SessionService');
    interceptor = new SessionInterceptor(cookieOptions, service.i);

    session = Session.createNew({} as SessionData, DateTime.cs('2023-11-01T10:00:00'), DateTime.cs('2023-11-01T11:00:00'));
    context = ExecutionContextTestHelper.createHttp();
  });

  afterEach(() => {
    service.checkExpections();
  });

  describe('afterRoute', () => {
    test('when not marked to delete and data is Result, then persist', async () => {
      context.request['session'] = session;

      service.expects('persist', session).andReturn(OKA(true));

      const result = await interceptor.afterRoute(context, OK('data'));

      expect(result).toEqual(OK('data'));
      const { name, ...expectedCookieOptions } = cookieOptions;
      expectedCookieOptions['expires'] = session.expireAt.toNativeDate();
      expect(context.response.cookies['SID']).toEqual({ value: session.id, options: expectedCookieOptions });
    });

    test('when not marked to delete and data is error Result, then persist', async () => {
      context.request['session'] = session;

      service.expects('persist', session).andReturn(OKA(true));

      const result = await interceptor.afterRoute(context, ERR('test'));

      expect(result).toMatchAppError({ type: 'test' });
      const { name, ...expectedCookieOptions } = cookieOptions;
      expectedCookieOptions['expires'] = session.expireAt.toNativeDate();
      expect(context.response.cookies['SID']).toEqual({ value: session.id, options: expectedCookieOptions });
    });

    test('when not marked to delete and data is AsyncResult, then persist', async () => {
      context.request['session'] = session;

      service.expects('persist', session).andReturn(OKA(true));

      const result = await interceptor.afterRoute(context, OKA('data'));

      expect(result).toEqual(OK('data'));
      const { name, ...expectedCookieOptions } = cookieOptions;
      expectedCookieOptions['expires'] = session.expireAt.toNativeDate();
      expect(context.response.cookies['SID']).toEqual({ value: session.id, options: expectedCookieOptions });
    });

    test('when not marked to delete and data is error AsyncResult, then persist', async () => {
      context.request['session'] = session;

      service.expects('persist', session).andReturn(OKA(true));

      const result = await interceptor.afterRoute(context, ERRA('test'));

      expect(result).toMatchAppError({ type: 'test' });
      const { name, ...expectedCookieOptions } = cookieOptions;
      expectedCookieOptions['expires'] = session.expireAt.toNativeDate();
      expect(context.response.cookies['SID']).toEqual({ value: session.id, options: expectedCookieOptions });
    });

    test('when marked to delete and data is Result, then delete from service and cookie', async () => {
      context.request['session'] = session;
      session.markToDelete();

      service.expects('delete', session.id).andReturn(OKA(true));

      const result = await interceptor.afterRoute(context, OK('data'));

      expect(result).toEqual(OK('data'));
      const { name, ...expectedCookieOptions } = cookieOptions;
      expect(context.response.clearedCookies['SID']).toEqual(expectedCookieOptions);
    });

    test('when marked to delete and data is AsyncResult, then delete from service and cookie', async () => {
      context.request['session'] = session;
      session.markToDelete();

      service.expects('delete', session.id).andReturn(OKA(true));

      const result = await interceptor.afterRoute(context, OKA('data'));

      expect(result).toEqual(OK('data'));
      const { name, ...expectedCookieOptions } = cookieOptions;
      expect(context.response.clearedCookies['SID']).toEqual(expectedCookieOptions);
    });
  });
});
