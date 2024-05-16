import { AppErrorCode, PanicError } from '@hexancore/common';
import { FResponse } from '@hexancore/core';
import { HttpException, Inject, Injectable, NestMiddleware } from '@nestjs/common';
import { HttpSessionService } from './HttpSessionService';
import type { FReqWithSession } from './types';

@Injectable()
export class SessionMiddleware implements NestMiddleware {
  public constructor(@Inject(HttpSessionService) private service: HttpSessionService) { }

  public use(req: FReqWithSession<any>, _res: FResponse['raw'], next: (error?: Error | any) => void): any {
    return this.service.tryLoadToRequest(req)
      .onOk(() => {
        next();
        return true;
      })
      .onErr(e => {
        if (e.code < AppErrorCode.INTERNAL_ERROR) {
          next(new HttpException(e, e.code));
        } else {
          next(new PanicError(e));
        }
      });
  }
}
