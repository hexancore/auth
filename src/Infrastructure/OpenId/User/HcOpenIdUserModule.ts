import { AppConfig } from '@hexancore/core';
import { ConfigurableModuleBuilder, FactoryProvider, Module, type InjectionToken, type NestModule, type Provider } from '@nestjs/common';
import { HcSessionModule, MemorySessionStoreProvider, RedisSessionStoreProvider } from '../../Session';
import { OpenIdClientFactory, type OpenIdClientFactoryOptions } from '../OpenIdClientFactory';
import { OpenIdUserAppOptionsToken, OpenIdUserClientToken } from './Constants';
import { OpenIdUserSessionData } from './Session';
import type { StatefullOpenIdUserAppOptions } from './Statefull';
import { StatefullOpenIdUserController } from './Statefull/StatefullOpenIdUserController';
import { StatefullOpenIdUserService } from './Statefull/StatefullOpenIdUserService';

const MODULE_CONFIG_TOKEN = 'HC_AUTH_OPENID_USER_CONFIG';
const DEFAULT_MODULE_CONFIG_PATH = 'core.auth.openid.user';
const DEFAULT_CLIENT_SECRET_PATH = 'core.auth.openid.user.client';

export interface OpenIdUserModuleConfig {
  client: {
    issuerDiscover: string;
    clientId: string,
    clientSecretPath: string,
  },
  app: StatefullOpenIdUserAppOptions;
}

export interface OpenIdUserModuleExtras {
  global?: boolean;
  configPath?: string;
  sessionStore?: Provider;
}
const DEFAULT_MODULE_EXTRAS: OpenIdUserModuleExtras = { global: true, configPath: DEFAULT_MODULE_CONFIG_PATH };

export function RedisOpenIdSessionStoreProvider(redisToken?: InjectionToken): Provider {
  return RedisSessionStoreProvider(OpenIdUserSessionData.c, redisToken);
}

export function MemoryOpenIdSessionStoreProvider(): Provider {
  return MemorySessionStoreProvider(OpenIdUserSessionData.c);
}

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN, OPTIONS_TYPE, ASYNC_OPTIONS_TYPE } =
  new ConfigurableModuleBuilder<object>()
    .setExtras(DEFAULT_MODULE_EXTRAS, (definition, extras) => {
      definition.providers = definition.providers ?? [];
      const sessionModule = HcSessionModule.forRoot({
        configPath: extras.configPath + '.app.session',
        store: extras.sessionStore
      });
      return {
        ...definition,
        imports: [
          sessionModule
        ],
        exports: [sessionModule],
        providers: [
          ...definition.providers,
          {
            provide: MODULE_CONFIG_TOKEN,
            inject: [AppConfig],
            useFactory: (appConfig: AppConfig) => {
              const configPath = extras.configPath ?? DEFAULT_MODULE_CONFIG_PATH;
              const config = appConfig.getOrPanic<OpenIdUserModuleConfig>(configPath);
              config.client.clientSecretPath = config.client.clientSecretPath ?? DEFAULT_CLIENT_SECRET_PATH;
              return config;
            }
          },
          StatefullOpenIdUserService,
        ],
        controllers: [StatefullOpenIdUserController],
        global: extras.global
      };
    },
    )
    .setClassMethodName('forRoot')
    .build();

const ClientProvider: FactoryProvider = {
  provide: OpenIdUserClientToken,
  inject: [AppConfig, MODULE_CONFIG_TOKEN, OpenIdClientFactory],
  useFactory: async (appConfig: AppConfig, config: OpenIdUserModuleConfig, clientFactory: OpenIdClientFactory) => {
    const clientSecret = appConfig.getSecret(config.client.clientSecretPath);
    const options: OpenIdClientFactoryOptions = { ...config.client, clientSecret: clientSecret.trim() };
    const r = await clientFactory.create(options);
    r.panicIfError();
    return r.v;
  },
};

@Module({
  providers: [
    OpenIdClientFactory,
    ClientProvider,
    {
      provide: OpenIdUserAppOptionsToken,
      inject: [MODULE_CONFIG_TOKEN],
      useFactory: (config: OpenIdUserModuleConfig) => {
        return config.app;
      }
    }
  ]
})
export class HcOpenIdUserModule extends ConfigurableModuleClass implements NestModule {
}
