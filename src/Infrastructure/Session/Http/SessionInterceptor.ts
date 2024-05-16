import { AR, ERR, OK, SAR, type R } from '@hexancore/common';
import { FResponse, HttpGroupableInterceptor } from '@hexancore/core';
import { HttpStatus } from '@nestjs/common';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { Session } from '../Session';
import type { HttpSessionService } from './HttpSessionService';
import type { FReqWithSession } from './types';

export class SessionInterceptor implements HttpGroupableInterceptor<any, any> {

  public constructor(private service: HttpSessionService) { }

  public beforeRoute(_args: HttpArgumentsHost): SAR<boolean> {
    return OK(true);
  }

  public afterRoute(args: HttpArgumentsHost, data: SAR<any>): SAR<any> {
    const req = args.getRequest<FReqWithSession<any>>();
    const session = req.session;
    if (!session) {
      return data;
    }

    return data
      .onErr((e) => {
        if (e.code < HttpStatus.INTERNAL_SERVER_ERROR) {
          return this.modifyResponse(session, args).onOk(() => ERR(e));
        }
      })
      .onOk((v) => this.modifyResponse(session, args).onOk(() => v));
  }

  public getName(): string {
    return 'core.auth.session';
  }

  private modifyResponse(session: Session<any>, args: HttpArgumentsHost): AR<boolean> {
    const res: FResponse = args.getResponse();
    return this.service.updateResponse(session, res);
  }
}
