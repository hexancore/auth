import { FactoryProvider, Module } from '@nestjs/common';
//import { OpenIdUserStatelessOptionsToken } from './OpenIdUserStatelessOptions';

import { ConfigurableModuleBuilder } from '@nestjs/common';
import { OpenIdClientToken, OpenIdUserApiOptionsToken } from './Constants';
import { OpenIdUserStatefullApiOptions } from './Statefull/OpenIdUserStatefullApiOptions';
import { OpenIdUserStatelessApiOptions } from './Stateless/OpenIdUserStatelessApiOptions';
import { OpenIdUserStatefullController } from './Statefull/OpenIdUserStatefullController';
import { OpenIdUserStatelessController } from './Stateless/OpenIdUserStatelessController';
import { OpenIdClientFactory, OpenIdClientFactoryOptions } from './OpenIdClientFactory';

export interface OpenIdUserAuthModuleOptions {
  client: OpenIdClientFactoryOptions;
  api: OpenIdUserStatelessApiOptions | OpenIdUserStatefullApiOptions;
}

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN, OPTIONS_TYPE, ASYNC_OPTIONS_TYPE } =
  new ConfigurableModuleBuilder<OpenIdUserAuthModuleOptions>()
    .setExtras(
      {
        statefull: true,
      },
      (definition, extras) => ({
        ...definition,
        controllers: [extras.statefull ? OpenIdUserStatefullController : OpenIdUserStatelessController],
      }),
    )
    .build();

const openIdUserApiOptionsProvider: FactoryProvider = {
  provide: OpenIdUserApiOptionsToken,
  useFactory: async (options: OpenIdUserAuthModuleOptions) => {
    return options.api;
  },
  inject: [MODULE_OPTIONS_TOKEN],
};

const openIdClientProvider: FactoryProvider = {
  provide: OpenIdClientToken,
  inject: [MODULE_OPTIONS_TOKEN, OpenIdClientFactory],
  useFactory: async (options: OpenIdUserAuthModuleOptions, clientFactory: OpenIdClientFactory) => {
    const clientResult = await clientFactory.create(options.client);
    if (clientResult.isError()) {
      clientResult.e.panic();
    }
    return clientResult.v;
  },
};

@Module({
  providers: [OpenIdClientFactory, openIdUserApiOptionsProvider, openIdClientProvider],
})
export class OpenIdUserModule extends ConfigurableModuleClass {}
