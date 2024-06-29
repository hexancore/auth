/**
 * @group unit
 */

import { Session, SessionData, SessionRequestInjectorInterceptor, SessionResponseUpdaterInterceptor, type HttpSessionService } from '@';
import { DateTime, OKA } from '@hexancore/common';
import { ExecutionContextTestHelper, MockHttpExecutionContext } from '@hexancore/core/testing/http';
import { M, mock } from '@hexancore/mocker';
import { firstValueFrom } from 'rxjs';

describe(SessionResponseUpdaterInterceptor.constructor.name, () => {
  let service: M<HttpSessionService>;
  let interceptor: SessionRequestInjectorInterceptor;

  let session: Session<any>;
  let context: MockHttpExecutionContext;

  beforeEach(() => {
    service = mock('SessionService');
    interceptor = new SessionRequestInjectorInterceptor(service.i);

    session = Session.createNew({} as SessionData, DateTime.cs('2023-11-01T10:00:00'), DateTime.cs('2023-11-01T11:00:00'));
    context = ExecutionContextTestHelper.createHttp();
  });

  afterEach(() => {
    service.checkExpections();
  });

  test('should try load session to request', async () => {
    const next = ExecutionContextTestHelper.createCallHandler("data");

    service.expects('tryLoadToRequest', context.getRequest() as any).andReturn(OKA(true));
    const result = await firstValueFrom(await interceptor.intercept(context, next));

    expect(result).toEqual('data');
  });

  test('when try load session to request error', async () => {
    const next = ExecutionContextTestHelper.createCallHandler("data");

    service.expects('tryLoadToRequest', context.getRequest() as any).andReturn(OKA(true));
    const result = await firstValueFrom(await interceptor.intercept(context, next));

    expect(result).toEqual('data');
  });

});
