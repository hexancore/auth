import { FactoryProvider, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuardOptionsToken } from './JwtAuthGuard';
import { AppConfigModule } from '@hexancore/core';

const JwtAuthGuardOptionsProvider: FactoryProvider = {
  provide: JwtAuthGuardOptionsToken,
  useFactory: (config: ConfigService) => {
    return config.getOrThrow('auth.jwt') ?? {};
  },
  inject: [ConfigService],
};

@Module({
  imports: [AppConfigModule],
  providers: [JwtAuthGuardOptionsProvider],
  exports: [JwtAuthGuardOptionsProvider],
})
export class JwtAuthModule {}
