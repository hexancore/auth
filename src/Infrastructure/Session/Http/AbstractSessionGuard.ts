import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { Session } from '../Session';
import type { FReqWithSession } from './types';
import { HttpSessionService } from './HttpSessionService';
import { type AR, type SAR } from '@hexancore/common';
import type { SessionData } from '../Data';

@Injectable()
export abstract class AbstractSessionGuard implements CanActivate {

  public constructor(@Inject(HttpSessionService) protected service: HttpSessionService) { }

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const result = await this.tryLoadSession(context)
      .onOk((session) => session ? this.canActivateWithSession(session) : false);

    if (result.isError()) {
      throw new UnauthorizedException(result.e);
    }

    if (!result.v) {
      throw new UnauthorizedException();
    }

    return true;
  }

  protected abstract canActivateWithSession<D extends SessionData = any>(session: Session<D>): SAR<boolean>;

  protected tryLoadSession<D extends SessionData = any>(context: ExecutionContext): AR<Session<D> | undefined> {
    const args = context.switchToHttp();
    const req = args.getRequest<FReqWithSession<any>>();
    return this.service.tryLoadToRequest(req).onOk(() => req.session);
  }
}
