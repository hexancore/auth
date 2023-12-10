import { ConfigurableModuleBuilder, Global, MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { SessionStore } from './Store';
import { SessionCookieOptions, SessionInterceptor } from './SessionInterceptor';
import { SessionService } from './SessionService';
import { CurrentTime } from '@hexancore/common';
import { APP_ORDERED_INTERCEPTOR_GROUP_TOKEN, HttpOrderedInterceptorGroup } from '@hexancore/core';
import { SESSION_COOKIE_NAME_TOKEN, SessionMiddleware } from './SessionMiddleware';

export interface SessionModuleOptions {
  store: SessionStore<any>;
  /**
   * Number of seconds or in ISO8601 format after PT like: 7H, 3H30S, 50M
   */
  initialDuration: string|number;
  cookie: SessionCookieOptions;
  interceptorPriority?: number;
}

export const DEFAULT_INTERCEPTOR_PRIORITY = 1000000;

const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } = new ConfigurableModuleBuilder<SessionModuleOptions>().build();

@Global()
@Module({
  providers: [
    {
      provide: SessionInterceptor,
      inject: [MODULE_OPTIONS_TOKEN, SessionService, APP_ORDERED_INTERCEPTOR_GROUP_TOKEN],
      useFactory: (moduleOptions: SessionModuleOptions, service: SessionService<any>, interceptorGroup: HttpOrderedInterceptorGroup) => {
        const interceptor = new SessionInterceptor(moduleOptions.cookie, service);
        interceptorGroup.add(moduleOptions.interceptorPriority ?? DEFAULT_INTERCEPTOR_PRIORITY, interceptor);
        return interceptor;
      },
    },
    {
      provide: SessionService,
      inject: [CurrentTime, MODULE_OPTIONS_TOKEN],
      useFactory: (ct, moduleOptions: SessionModuleOptions) => {
        return new SessionService(ct, moduleOptions.store, moduleOptions.initialDuration);
      },
    },

    {
      provide: SESSION_COOKIE_NAME_TOKEN,
      inject: [MODULE_OPTIONS_TOKEN, SessionService],
      useFactory: (moduleOptions: SessionModuleOptions) => {
        return moduleOptions.cookie.name;
      },
    },
  ],
  exports: [SessionService, SESSION_COOKIE_NAME_TOKEN],
})
export class SessionModule extends ConfigurableModuleClass implements NestModule {
  public configure(consumer: MiddlewareConsumer): any {
    consumer.apply(SessionMiddleware).forRoutes({ path: '(.*)/protected/(.*)', method: RequestMethod.ALL });
  }
}
