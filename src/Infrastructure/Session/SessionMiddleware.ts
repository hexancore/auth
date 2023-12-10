import { FRequest, FResponse } from '@hexancore/core';
import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import { FReqWithSession } from './SessionInterceptor';

import { OK } from '@hexancore/common';
import { Session } from './Session';
import { SessionService } from './SessionService';

export const SESSION_COOKIE_NAME_TOKEN = 'HC_AUTH_SESSION_COOKIE_NAME';

@Injectable()
export class SessionMiddleware implements NestMiddleware {
  public constructor(@Inject(SESSION_COOKIE_NAME_TOKEN) private cookieName: string, private service: SessionService<any>) {}
  public use(req: FReqWithSession<any>, _res: FResponse, next: (error?: Error | any) => void): any {
    const sid = req.cookies[this.cookieName];
    if (Session.isValidId(sid)) {
      return this.service.get(sid).onOk((session) => {
        req.session = session;
        next();
        return OK(true);
      });
    }

    next();
  }
}
