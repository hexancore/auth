import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { FReqWithSession } from './SessionInterceptor';
import { Session } from './Session';
import { FResponse } from '@hexancore/core';
import { SESSION_COOKIE_NAME_TOKEN } from './SessionMiddleware';

@Injectable()
export class SessionGuard implements CanActivate {

  public constructor(@Inject(SESSION_COOKIE_NAME_TOKEN) private cookieName: string) {

  }

  public canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const http = context.switchToHttp();
    const r: FReqWithSession<any> = http.getRequest();

    if (r.session instanceof Session) {
      if (r.session.isDeleted()) {
        http.getResponse<FResponse>().clearCookie(this.cookieName);
      } else {
        return true;
      }
    }

    throw new UnauthorizedException();
  }
}
