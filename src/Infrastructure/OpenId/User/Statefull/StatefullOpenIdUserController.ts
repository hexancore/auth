import { AR, Logger, OKA, getLogger, type AppError } from '@hexancore/common';
import { Controller, Get, Inject, Redirect, Req, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

import { RedirectResult } from '@hexancore/core';
import { AuthenticatedSessionGuard, SessionGuard, SessionService } from '../../../Session';
import { OpenIdUserSessionData, type FReqWithOpenIdSession, type OpenIdAuthData, type OpenIdAuthRequestData } from '../Session';
import { BASE_USER_MODULE_ROUTE, LOGIN_CALLBACK_ROUTE, LOGOUT_CALLBACK_ROUTE, StatefullOpenIdUserService } from './StatefullOpenIdUserService';

@ApiTags('User')
@Controller({ path: BASE_USER_MODULE_ROUTE })
export class StatefullOpenIdUserController {
  protected log: Logger;

  public constructor(
    @Inject(StatefullOpenIdUserService) private service: StatefullOpenIdUserService,
    @Inject(SessionService) private sessionService: SessionService<OpenIdUserSessionData>
  ) {
    this.log = getLogger('core.auth.infra.openid.user', ['core', 'auth', 'infra', 'openid']);
  }

  /**
   * Login route - redirects to login page and after login auth service redirects to `auth.login-callback` route
   */
  @Get('public/auth/login')
  @Redirect()
  @ApiBadRequestResponse()
  public login(@Req() req: FReqWithOpenIdSession): AR<RedirectResult> {
    const loginRedirect = this.service.authorizationUrl(req.query['redirect_id'] ?? undefined);
    return this.createLoginInteractionSession(req, loginRedirect.authRequestData).onOk(() => {
      return RedirectResult.found(loginRedirect.url);
    });
  }

  private createLoginInteractionSession(req: FReqWithOpenIdSession, data: OpenIdAuthRequestData): AR<boolean> {
    if (req.session) {
      return this.sessionService.terminate(req.session).onOk(() => {
        req.session = null;
        return this.createLoginInteractionSession(req, data);
      });
    }

    const sessionData = OpenIdUserSessionData.createInAuthRequestState(data);
    req.session = this.sessionService.create(sessionData);
    return OKA(true);
  }

  /**
   * Login Callback route - auth service redirects here after login
   * @param req
   * @returns Redirects to selected app success or error location
   */
  @Get(LOGIN_CALLBACK_ROUTE)
  @UseGuards(SessionGuard)
  @Redirect()
  @ApiUnauthorizedResponse()
  @ApiBadRequestResponse()
  public loginCallback(@Req() req: FReqWithOpenIdSession): AR<RedirectResult> {
    return this.service.callLoginCallback(req.url, req.session.data.authRequest)
      .onOk((data) => this.onSuccessLogin(req, data))
      .onErr((e) => this.onErrorLogin(req, e))
      .onOk((redirectUrl) => RedirectResult.found(redirectUrl));
  }

  protected onSuccessLogin(req: FReqWithOpenIdSession, data: OpenIdAuthData): AR<string> {
    const redirectId = req.session.data.authRequest.redirectId;
    return this.updateSessionWithAuthData(data, req).onOk(() => {
      this.log.info("User success login", req.session.toLogContext());
      return this.service.authenticatedUrl(redirectId);
    });
  }

  protected updateSessionWithAuthData(data: OpenIdAuthData, req: FReqWithOpenIdSession): AR<boolean> {
    req.session.data.setAsAuthenticated(data);
    req.session.expandLifetime(this.service.getSessionLifetimeDuration());
    return this.sessionService.save(req.session);
  }

  protected onErrorLogin(req: FReqWithOpenIdSession, e: AppError): AR<string> {
    const redirectId = req.session.data.authRequest.redirectId;
    this.log.log(e);
    return this.sessionService.terminate(req.session).onOk(() => this.service.errorUrl(redirectId));
  }

  @Get('protected/auth/logout')
  @Redirect()
  @UseGuards(AuthenticatedSessionGuard)
  @ApiUnauthorizedResponse()
  public logout(@Req() req: FReqWithOpenIdSession): AR<RedirectResult> {
    const url = this.service.endSessionUrl(req.session);
    req.session.markToTerminate();
    this.log.info("User logout", req.session.toLogContext());
    return OKA(RedirectResult.found(url));
  }

  /**
   * Called after logout from OIDC Provider
   */
  @Get(LOGOUT_CALLBACK_ROUTE)
  @Redirect()
  public logoutCallback(): AR<RedirectResult> {
    return OKA(RedirectResult.found(this.service.getLogoutRedirectUrl()));
  }

}
