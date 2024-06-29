import { AppError, AppErrorCode, Logger, getLogger } from '@hexancore/common';
import { FRequest } from '@hexancore/core/http';
import { CanActivate, ExecutionContext, Inject, UnauthorizedException } from '@nestjs/common';
import { JWTVerifyOptions, RemoteJWKSetOptions, createRemoteJWKSet, jwtVerify } from 'jose';
import { JOSEError } from 'jose/errors';
import { JwtAuthInfraErrors } from './JwtAuthErrors';

export const JwtAuthGuardOptionsToken = Symbol('JwtAuthGuardOptionsToken');
export interface JwtAuthGuardOptions {
  jwks: {
    uri: string;
    options?: RemoteJWKSetOptions;
  };
  verify?: JWTVerifyOptions;
  logger?: {
    includedVerifyErrors?: string[];
  };
}

export const REQ_JWT_PAYLOAD_KEY = 'HC_JwtTokenPayload';

export class JwtAuthGuard implements CanActivate {
  private jwks: any;
  protected logger: Logger;

  protected loggingIncludedVerifyErrors?: Set<string>;

  public constructor(@Inject(JwtAuthGuardOptionsToken) private options: JwtAuthGuardOptions) {
    this.jwks = createRemoteJWKSet(new URL(this.options.jwks.uri), this.options.jwks.options);

    this.loggingIncludedVerifyErrors =
      this.options.logger?.includedVerifyErrors === undefined ? undefined : new Set(this.options.logger.includedVerifyErrors);

    this.logger = getLogger('auth_jwt_guard', ['auth']);
  }

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(req);
    try {
      req[REQ_JWT_PAYLOAD_KEY] = (await jwtVerify(token, this.jwks, this.options.verify)).payload;
      return true;
    } catch (e) {
      const ei: JOSEError = e as JOSEError;
      if (this.loggingIncludedVerifyErrors === undefined || this.loggingIncludedVerifyErrors.has(ei.code)) {
        this.logger.warn('jwt.verify: ' + ei.code + ' ' + ei.message);
      }

      throw this.unauthorized(JwtAuthInfraErrors.token_verify);
    }
  }

  private extractTokenFromHeader(req: FRequest): string {
    const [type, token] = req.headers.authorization?.split(' ', 2) ?? ['', ''];
    if (type !== 'Bearer') {
      throw this.unauthorized(JwtAuthInfraErrors.missing_token_in_header);
    }
    return token ?? '';
  }

  private unauthorized(errorType: string): UnauthorizedException {
    return new UnauthorizedException(new AppError({type: errorType, code: AppErrorCode.UNAUTHORIZED}));
  }
}

export type FReqJwtAuth<T = Record<string, any>> = { [REQ_JWT_PAYLOAD_KEY]: T };
