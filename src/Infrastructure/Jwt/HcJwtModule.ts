import { FactoryProvider, Module } from '@nestjs/common';
import { JwtAuthGuardOptionsToken } from './JwtAuthGuard';
import { AppConfig, HcAppConfigModule } from '@hexancore/core';

const JwtAuthGuardOptionsProvider: FactoryProvider = {
  provide: JwtAuthGuardOptionsToken,
  useFactory: (config: AppConfig) => {
    return config.getOrPanic('auth.jwt');
  },
  inject: [AppConfig],
};

@Module({
  imports: [HcAppConfigModule],
  providers: [JwtAuthGuardOptionsProvider],
  exports: [JwtAuthGuardOptionsProvider],
})
export class HcJwtAuthModule {}
