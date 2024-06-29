#!/usr/bin/env tsx
process.env.TZ = 'UTC';
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = '0';

import { HcAppRedisModule } from '@hexancore/cloud/redis';
import { AppMeta, EnvAppMetaProvider } from '@hexancore/common';
import { HcModule } from '@hexancore/core';
import { HcHttpModule, HttpAppBootstrap } from '@hexancore/core/http';
import { Global, Module } from '@nestjs/common';
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
    HcModule.forRoot(),
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

HttpAppBootstrap(AppModule, {
  adapter: {
    stdPlugins: {
      cookie: true,
    },
    instanceOptions: {
      https: {
        key: fs.readFileSync('docker/dev/server.key'),
        cert: fs.readFileSync('docker/dev/server.cert')
      }
    }
  }
});