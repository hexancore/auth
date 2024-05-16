import { FactoryProvider, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuardOptionsToken } from './JwtAuthGuard';
import { HcAppConfigModule } from '@hexancore/core';

const JwtAuthGuardOptionsProvider: FactoryProvider = {
  provide: JwtAuthGuardOptionsToken,
  useFactory: (config: ConfigService) => {
    return config.getOrThrow('auth.jwt') ?? {};
  },
  inject: [ConfigService],
};

@Module({
  imports: [HcAppConfigModule],
  providers: [JwtAuthGuardOptionsProvider],
  exports: [JwtAuthGuardOptionsProvider],
})
export class HcJwtAuthModule {}
