import { Signer } from '@fastify/cookie';
import { AppErrorCode, CurrentTime, ERR, LogicError, type R } from '@hexancore/common';
import { APP_ORDERED_INTERCEPTOR_GROUP_TOKEN, AppConfig, HttpOrderedInterceptorGroup } from '@hexancore/core';
import { ConfigurableModuleBuilder, Global, MiddlewareConsumer, Module, NestModule, RequestMethod, type Provider } from '@nestjs/common';
import Validator from 'fastest-validator';
import { HttpSessionService } from './Http';
import { SessionInterceptor } from './Http/SessionInterceptor';
import { SessionMiddleware } from './Http/SessionMiddleware';
import {
  DEFAULT_SESSION_MODULE_CONFIG_PATH,
  DEFAULT_SESSION_MODULE_EXTRAS,
  SESSION_MODULE_CONFIG_TOKEN,
  SessionConfigValidationSchema,
  type SessionModuleConfig,
  type SessionModuleExtras,
  type SessionModuleOptions
} from './SessionModuleConfig';
import { SessionService } from './SessionService';
import { SESSION_STORE_TOKEN, type SessionStore } from './Store';
import { AuthSessionErrors } from './AuthSessionErrors';

const v = new Validator();

const SessionInterceptorProvider = (extras: SessionModuleExtras): Provider => ({
  provide: SessionInterceptor,
  inject: [HttpSessionService, APP_ORDERED_INTERCEPTOR_GROUP_TOKEN],
  useFactory: (service: HttpSessionService, interceptorGroup: HttpOrderedInterceptorGroup) => {
    const interceptor = new SessionInterceptor(service);
    interceptorGroup.add(extras.interceptorPriority, interceptor);
    return interceptor;
  }
});

const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } = new ConfigurableModuleBuilder<SessionModuleOptions>()
  .setClassMethodName('forRoot')
  .setExtras(DEFAULT_SESSION_MODULE_EXTRAS, (definition, extras) => {
    if (!extras.store) {
      throw new LogicError('HcSessionModule.options.store is not set');
    }

    definition.providers.push(extras.store);
    definition.providers.push(SessionInterceptorProvider(extras));
    return definition;
  })
  .build();

@Global()
@Module({
  providers: [
    {
      provide: SESSION_MODULE_CONFIG_TOKEN,
      inject: [MODULE_OPTIONS_TOKEN, AppConfig],
      useFactory: (moduleOptions: SessionModuleOptions, appConfig: AppConfig) => {
        const configPath = moduleOptions.configPath ?? DEFAULT_SESSION_MODULE_CONFIG_PATH;
        const config = appConfig.config.getOrThrow<SessionModuleConfig>(configPath);

        const configValidation = v.compile(SessionConfigValidationSchema)(config);
        if (configValidation !== true) {
          ERR('core.auth.infra.session.config_invalid', AppErrorCode.INTERNAL_ERROR, configValidation).panicIfError();
        }
        return config;
      }
    },
    {
      provide: SessionService,
      inject: [CurrentTime, SESSION_STORE_TOKEN, SESSION_MODULE_CONFIG_TOKEN],
      useFactory: (ct, store: SessionStore<any>, config: SessionModuleConfig) => {
        return new SessionService(ct, store, config.initialLifetime);
      },
    },
    {
      provide: HttpSessionService,
      inject: [SESSION_MODULE_CONFIG_TOKEN, SessionService, AppConfig],
      useFactory: (config: SessionModuleConfig, sessionService: SessionService<any>, appConfig: AppConfig) => {

        let signer: Signer;
        if (config.cookie.sign.enabled) {
          const secretGetResult: R<string> = appConfig.secrets.get(config.cookie.sign.secretPath);
          secretGetResult.panicIfError();
          const signSecret = secretGetResult.v.split('\n');

          const check = v.compile({
            $$root: true,
            type: 'array',
            items: { type: 'string', min: 26 },
            unique: true
          });

          const checkResult = check(signSecret);
          if (checkResult !== true) {
            ERR(AuthSessionErrors.config_cookie_sign_secret_invalid, AppErrorCode.INTERNAL_ERROR, checkResult).panicIfError();
          }

          signer = new Signer(signSecret);
        }
        return new HttpSessionService(config.cookie, sessionService, signer);
      }
    }
  ],
  exports: [SessionService, HttpSessionService],
})
export class HcSessionModule extends ConfigurableModuleClass implements NestModule {
  public configure(consumer: MiddlewareConsumer): any {
    consumer.apply(SessionMiddleware).forRoutes({ path: '(.*)/protected/(.*)', method: RequestMethod.ALL });
  }
}
