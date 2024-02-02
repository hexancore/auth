import { AR, ERR, ERRA, OK, OKA, Result, SAR } from '@hexancore/common';
import { FRequest, FResponse, HttpGroupableInterceptor } from '@hexancore/core';
import { HttpStatus } from '@nestjs/common';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { SessionData } from './Data/SessionData';
import { Session } from './Session';
import { SessionService } from './SessionService';
import { SessionState } from './SessionState';

export interface SessionCookieOptions {
  name: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax' | 'none' | 'strict' | boolean;
  domain?: string;
  path?: string;
}

export type FReqWithSession<D extends SessionData> = FRequest & { session: Session<D> };

export class SessionInterceptor implements HttpGroupableInterceptor<any, any> {
  private cookieName: string;
  private cookieOptions: Omit<SessionCookieOptions, 'name'>;
  public constructor(cookieOptions: SessionCookieOptions, private service: SessionService<any>) {
    this.cookieName = cookieOptions.name;
    const {name, ...opts} = cookieOptions;
    this.cookieOptions = opts;
  }

  public beforeRoute(_args: HttpArgumentsHost): SAR<boolean> {
    return OK(true);
  }

  public afterRoute(args: HttpArgumentsHost, data: SAR<any>): SAR<any> {
    const req: FReqWithSession<any> = args.getRequest();
    const session = req.session;
    if (!session) {
      return data;
    }

    if (data instanceof Result) {
      if (data.isError()) {
        return ERRA(data.e).onErr((e) => {
          if (e.code < HttpStatus.INTERNAL_SERVER_ERROR) {
            return this.modifyResponse(session, args).onOk(() => ERR(e));
          }
        });
      } else {
        return data.onOk((v) => {
        return this.modifyResponse(session, args).onOk(() => v);

      });
      }
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
    return 'session';
  }

  private modifyResponse(session: Session<any>, args: HttpArgumentsHost): AR<boolean> {
    const res: FResponse = args.getResponse();

    if (session.state === SessionState.DELETED) {
      res.clearCookie(this.cookieName, this.cookieOptions);
      return this.service.delete(session.id);
    }

    return this.service.persist(session).onOk(() => {
      const setCookieOptions = { ...this.cookieOptions, expires: session.expireAt.toNativeDate() };
      res.setCookie(this.cookieName, session.id, setCookieOptions);
      return OK(true);
    });
  }
}
