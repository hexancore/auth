#!/usr/bin/env tsx
process.env.TZ = 'UTC';
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = '0';

import { HcAppRedisModule } from '@hexancore/cloud/redis';
import { AppMeta, EnvAppMetaProvider } from '@hexancore/common';
import { FastifyAdapterFactory, HcHttpModule, HcModule, UncaughtErrorCatcher, httpBootstrap } from '@hexancore/core';
import { Global, Module } from '@nestjs/common';
import { FastifyHttpsOptions } from 'fastify';
import fs from 'fs';
import {
  HcOpenIdUserModule,
  RedisOpenIdSessionStoreProvider,
} from '../../lib';
import {
  TestOpenIdAppModule
} from '../../lib/Test/Infrastructure/OpenId/App';

AppMeta.setProvider(EnvAppMetaProvider);

@Global()
@Module({
  imports: [
    HcModule.forRoot({}),
    HcHttpModule,
    HcAppRedisModule,
    HcOpenIdUserModule.forRoot({
      sessionStore: RedisOpenIdSessionStoreProvider(),
    }),
    TestOpenIdAppModule
  ]
})
class AppModule {
}

const options = FastifyAdapterFactory.createDefaultOptions(new UncaughtErrorCatcher());
const adapterOptions = options.adapter as FastifyHttpsOptions<any>;
adapterOptions.https = {
  key: fs.readFileSync('docker/dev/server.key'),
  cert: fs.readFileSync('docker/dev/server.cert')
};

httpBootstrap({ mainModule: AppModule, swagger: AppMeta.get().isDev(), adapter: options });