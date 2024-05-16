import type { CookieSerializeOptions } from "@fastify/cookie";
import { AppErrorCode, ERR, ERRA, INTERNAL_ERR, OK, OKA, getLogger, type AR, type InternalError, type Logger, type R, type StdErrors } from "@hexancore/common";
import type { FResponse } from "@hexancore/core/.";
import { AuthSessionErrors } from "../AuthSessionErrors";
import { Session } from "../Session";
import type { SessionService } from "../SessionService";
import type { FReqWithSession } from "./types";

import { Signer } from '@fastify/cookie';

export interface SessionCookieOptions {
  name: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax' | 'none' | 'strict' | boolean;
  domain?: string;
  path: string;
}

export class HttpSessionService {
  private cookieName: string;
  private cookieOptions: Omit<SessionCookieOptions, 'name'>;
  private log: Logger;

  public constructor(options: SessionCookieOptions, private service: SessionService<any>, private cookieSigner?: Signer) {
    this.cookieName = options.name;
    const { name, ...opts } = options;
    this.cookieOptions = opts;

    this.log = getLogger('core.auth.infra.session.http', ['core', 'auth', 'infra', 'session']);
  }

  public tryLoadToRequest(req: FReqWithSession<any>): AR<boolean> {
    const extractResult = this.extractSessionIdFromCookie(req);
    if (extractResult.isError()) {
      if (extractResult.e.code === AppErrorCode.UNAUTHORIZED) {
        req.session = Session.createInvalid();
        return OKA(true);
      }

      return ERRA(extractResult.e);
    }

    const extracted = extractResult.v;
    if (extracted === null) {
      return OKA(true);
    }

    return this.loadToRequest(req, extracted.sessionId, extracted.renewCookieValue);
  }

  private extractSessionIdFromCookie(req: FReqWithSession<any>): R<{ renewCookieValue: boolean, sessionId: string } | null, AuthSessionErrors<'session_cookie_invalid'>> {
    const cookieValue = req.cookies[this.cookieName];
    if (!cookieValue) {
      return OK(null);
    }

    if (this.cookieSigner) {
      return this.unsignCookie(cookieValue);
    }

    if (!Session.isValidId(cookieValue)) {
      this.log.warn('invalid cookie session id', { v: cookieValue });
      return ERR(AuthSessionErrors.session_cookie_invalid, AppErrorCode.UNAUTHORIZED);
    }

    return OK({
      renewCookieValue: false,
      sessionId: cookieValue
    });
  }

  private unsignCookie(cookieValue: string): R<{ renewCookieValue: boolean, sessionId: string } | null, AuthSessionErrors<'session_cookie_invalid'>> {
    try {
      const result = this.cookieSigner.unsign(cookieValue);
      if (!result.valid) {
        this.log.warn('cookie invalid signature', { v: cookieValue });
        return ERR(AuthSessionErrors.session_cookie_invalid, AppErrorCode.UNAUTHORIZED);
      }

      if (!Session.isValidId(result.value)) {
        this.log.warn('invalid cookie session id', { v: result.value });
        return ERR(AuthSessionErrors.session_cookie_invalid, AppErrorCode.UNAUTHORIZED);
      }

      return OK({ renewCookieValue: result.renew, sessionId: result.value });
    } catch (e) {
      return INTERNAL_ERR(e);
    }
  }

  private loadToRequest(req: FReqWithSession<any>, sessionId: string, renewCookieValue: boolean): AR<boolean> {
    return this.service.get(sessionId).onOk((session) => {
      if (session) {
        if (renewCookieValue) {
          session.forceRenewCookie = true;
        }
      }

      req.session = session ?? Session.createTerminated(sessionId);
      return true;
    });
  }

  public updateResponse(session: Session<any>, res: FResponse): AR<boolean> {
    if (session.isTerminated()) {
      this.clearSessionCookie(res);
      return OKA(true);
    }

    if (session.isToTerminate()) {
      res.clearCookie(this.cookieName, this.cookieOptions);
      return this.service.terminate(session);
    }

    return this.service.save(session).onOk(() => {
      this.updateSessionCookie(session, res);
      return true;
    });
  }

  private updateSessionCookie(session: Session<any>, res: FResponse) {
    if (!session.needRenewCookie) {
      return;
    }
    session.forceRenewCookie = false;

    const options: CookieSerializeOptions = {
      ...this.cookieOptions,
      expires: session.expireAt.toNativeDate(),
    };

    let cookieValue = session.id;
    if (this.cookieSigner) {
      cookieValue = this.cookieSigner.sign(cookieValue);
    }

    res.setCookie(this.cookieName, cookieValue, options);
  }

  private clearSessionCookie(res: FResponse): void {
    res.clearCookie(this.cookieName, this.cookieOptions);
  }
}