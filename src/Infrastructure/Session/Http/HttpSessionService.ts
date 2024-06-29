import type { CookieSerializeOptions } from "@fastify/cookie";
import { AppErrorCode, ERR, ERRA, INTERNAL_ERR, LogicError, OK, OKA, getLogger, type AR, type Logger, type R } from "@hexancore/common";
import type { FResponse } from "@hexancore/core/http";
import { AuthSessionErrors } from "../AuthSessionErrors";
import { Session } from "../Session";
import type { SessionService } from "../SessionService";
import type { FReqWithSession } from "./types";

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
  private cookieOptions: Omit<SessionCookieOptions, 'name'> & { signed: true; };
  private log: Logger;

  public constructor(options: SessionCookieOptions, private service: SessionService<any>) {
    this.cookieName = options.name;
    const { name, ...opts } = options;
    this.cookieOptions = { ...opts, signed: true };

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

  private extractSessionIdFromCookie(req: FReqWithSession<any>): R<{ renewCookieValue: boolean, sessionId: string; } | null, AuthSessionErrors<'session_cookie_invalid'>> {
    if (!req.cookies) {
      return OK(null);
    }

    const cookieValue = req.cookies[this.cookieName];
    if (!cookieValue) {
      return OK(null);
    }

    return this.unsignCookie(req, cookieValue);
  }

  private unsignCookie(req: FReqWithSession<any>, cookieValue: string): R<{ renewCookieValue: boolean, sessionId: string; } | null, AuthSessionErrors<'session_cookie_invalid'>> {
    try {
      const result = req.unsignCookie(cookieValue);
      if (!result.valid) {
        this.log.warn('cookie invalid signature', { v: cookieValue });
        return ERR(AuthSessionErrors.session_cookie_invalid, AppErrorCode.UNAUTHORIZED);
      }

      if (!Session.isValidId(result.value)) {
        this.log.warn('invalid cookie session id', { v: result.value });
        return ERR(AuthSessionErrors.session_cookie_invalid, AppErrorCode.UNAUTHORIZED);
      }

      return OK({ renewCookieValue: result.renew, sessionId: result.value! });
    } catch (e) {
      return INTERNAL_ERR(e as Error);
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
      this.clearSessionCookie(res);
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
      expires: session.expireAt!.toNativeDate(),
    };

    res.setCookie(this.cookieName, session.id, options);
  }

  private clearSessionCookie(res: FResponse): void {
    res.clearCookie(this.cookieName, this.cookieOptions);
  }
}