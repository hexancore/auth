/**
 * @group unit
 */

import { Test, TestingModule } from '@nestjs/testing';
import { OpenIdUserModule, OpenIdUserStatefullController, SessionService } from '@';
import { Client, Issuer } from 'openid-client';
import { M, Mocker, mock } from '@hexancore/mocker/.';
import { OpenIdClientFactory } from '@/Infrastructure/OpenId/OpenIdClientFactory';
import { CurrentTime, OKA } from '@hexancore/common';
import { Global, Module } from '@nestjs/common';
import { SESSION_COOKIE_NAME_TOKEN } from '@/Infrastructure/Session/SessionMiddleware';

const SessionServiceMockToken = 'HC_CORE_SESSION_SERVICE_MOCK';

const SessionServiceProvider = {
  provide: SessionService,
  inject: [SessionServiceMockToken],
  useFactory: (service: M<SessionService<any>>) => service.i,
};

@Global()
@Module({
  providers: [
    {
      provide: SessionServiceMockToken,
      useFactory: () => {
        const m = mock<SessionService<any>>('SessionService');
        m.allowsNotExistingDynamic(['then', 'onModuleDestroy', 'beforeApplicationShutdown', 'onApplicationShutdown']);
        return m;
      },
    },
    {
      provide: SessionService,
      inject: [SessionServiceMockToken],
      useFactory: (service: M<SessionService<any>>) => service.i,
    },

    {
      provide: SESSION_COOKIE_NAME_TOKEN,
      useValue: 'SID',
    },

    {
      provide: CurrentTime,
      useFactory: () => new CurrentTime(),
    },
  ],
  exports: [SessionService, CurrentTime, SESSION_COOKIE_NAME_TOKEN],
})
class TestAppInfraCommonsModule {}

describe('OpenIdUserModule', () => {
  test('statefull', async () => {
    const openIdClientFactory = mock<OpenIdClientFactory>('OpenIdClientFactory');

    const client = mock<Client>('OpenIdClient');
    client.allowsNotExistingDynamic(['then', 'onModuleDestroy', 'beforeApplicationShutdown', 'onApplicationShutdown']);
    const clientOptions = {
      issuerDiscover: 'http://localhost/test',
      clientId: 'test_id',
      secretId: 'test_secret',
    };
    openIdClientFactory.expects('create', clientOptions).andReturn(OKA(client.i));
    openIdClientFactory.allowsNotExistingDynamic(['then', 'onModuleDestroy', 'beforeApplicationShutdown', 'onApplicationShutdown']);

    const module = await Test.createTestingModule({
      imports: [
        TestAppInfraCommonsModule,
        OpenIdUserModule.register({
          statefull: true,
          client: clientOptions,
          api: {
            type: 'statefull',
            app: {
              loginScope: ['profile'],
              name: 'test',
              redirect: {
                baseUri: 'http://localhost/',
                errorUri: 'http://localhost/error',
                logoutUri: 'http://localhost/logout',
                loginRequest: {
                  popup: 'http://localhost/login-request'
                },
              },
            },
            baseUri: 'http://localhost/api',
          },
        }),
      ],
    })
      .overrideProvider(OpenIdClientFactory)
      .useValue(openIdClientFactory.i)
      .compile();

    const currentController = module.get(OpenIdUserStatefullController);

    expect(currentController).toBeInstanceOf(OpenIdUserStatefullController);

    module.close();
    openIdClientFactory.checkExpections();
  });
});
