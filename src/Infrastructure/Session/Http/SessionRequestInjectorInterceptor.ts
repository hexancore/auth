import { Inject, Injectable } from '@nestjs/common';
import { type CallHandler, type ExecutionContext, type NestInterceptor } from '@nestjs/common/interfaces';
import { of, type Observable } from 'rxjs';
import { HttpSessionService } from './HttpSessionService';
import type { FReqWithSession } from './types';

/**
 * Injects session to request when exist.
 */
@Injectable()
export class SessionRequestInjectorInterceptor implements NestInterceptor {

  public constructor(@Inject(HttpSessionService) private service: HttpSessionService) { }

  public async intercept(context: ExecutionContext, next: CallHandler<any>): Promise<Observable<any>> {
    const httpContext = context.switchToHttp();
    const req = httpContext.getRequest<FReqWithSession<any>>();

    const result = await this.service.tryLoadToRequest(req);

    if (result.isError()) {
      return of(result);
    }

    return next.handle();
  }
}
