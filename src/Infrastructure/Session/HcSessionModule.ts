import { AppErrorCode, CurrentTime, ERR, LogicError } from '@hexancore/common';
import { APP_ORDERED_INTERCEPTOR_GROUP_TOKEN, AppConfig, HttpOrderedInterceptorGroup } from '@hexancore/core';
import { ConfigurableModuleBuilder, Global, Module, NestModule, type Provider } from '@nestjs/common';
import Validator from 'fastest-validator';
import { HttpSessionService } from './Http';
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
import { SessionResponseUpdaterInterceptor } from './Http/SessionResponseUpdaterInterceptor';

const v = new Validator();

const SessionInterceptorProvider = (extras: SessionModuleExtras): Provider => ({
  provide: SessionResponseUpdaterInterceptor,
  inject: [HttpSessionService, APP_ORDERED_INTERCEPTOR_GROUP_TOKEN],
  useFactory: (service: HttpSessionService, interceptorGroup: HttpOrderedInterceptorGroup) => {
    const interceptor = new SessionResponseUpdaterInterceptor(service);
    interceptorGroup.add(extras.interceptorPriority!, interceptor);
    return interceptor;
  }
});

const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } = new ConfigurableModuleBuilder<SessionModuleOptions>()
  .setClassMethodName('forRoot')
  .setExtras(DEFAULT_SESSION_MODULE_EXTRAS, (definition, extras) => {
    if (!extras.store) {
      throw new LogicError('HcSessionModule.options.store is not set');
    }
    definition.providers = definition.providers ?? [];
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
      useFactory: (config: SessionModuleConfig, sessionService: SessionService<any>) => {
        return new HttpSessionService(config.cookie, sessionService);
      }
    }
  ],
  exports: [SessionService, HttpSessionService],
})
export class HcSessionModule extends ConfigurableModuleClass implements NestModule {
}
