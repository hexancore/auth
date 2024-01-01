// auth/auth.controller.ts
import { AR, CurrentTime, DateTime, ERR, Logger, OK, OKA, P, getLogger } from '@hexancore/common';
import { Controller, Get, Inject, Post, Query, Redirect, Req, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

import { RedirectResult } from '@hexancore/core';
import { Duration } from '@js-joda/core';
import { Client, TokenSet } from 'openid-client';
import { RawJwt, RawJwtSet } from '../../Jwt';
import { BasicSessionData, BasicSessionUser, FReqWithSession, SessionGuard, SessionService } from '../../Session';
import { DEFAULT_REFRESH_TOKEN_MAX_AGE, OpenIdClientToken, OpenIdUserApiOptionsToken } from '../Constants';
import { OpenIdAppMeta } from '../OpenIdAppMeta';
import { OpenIdUserStatefullApiOptions } from './OpenIdUserStatefullApiOptions';

const LOGIN_CALLBACK_ROUTE = 'protected/auth/login-callback';
const LOGOUT_CALLBACK_ROUTE = 'protected/auth/logout-callback';

@ApiTags('User')
@Controller({ path: '/user' })
export class OpenIdUserStatefullController {
  protected logger: Logger;

  public constructor(
    @Inject(OpenIdUserApiOptionsToken) private options: OpenIdUserStatefullApiOptions,
    @Inject(OpenIdClientToken) private client: Client,
    @Inject(SessionService) private sessionService: SessionService<BasicSessionData>,
    @Inject(CurrentTime) private ct: CurrentTime,
  ) {
    this.logger = getLogger('user.infra.auth.openid.statefull_api', ['auth']);
  }

  /**
   * Login route - redirects to login page and after login auth service redirects to `auth.login-callback` route
   */
  @Get('public/auth/login')
  @Redirect()
  @ApiBadRequestResponse()
  public login(@Query('redirect_id') redirectId?: string): AR<RedirectResult> {
    return this.getAppMeta().map((appMeta) => {
      const redirectUri = this.getRedirectLoginCallbackUri(redirectId);
      const authorizationUrl = this.client.authorizationUrl({
        scope: appMeta.loginScope.join(' '),
        redirect_uri: redirectUri,
      });
      return RedirectResult.found(authorizationUrl);
    });
  }

  /**
   * Login Callback route - auth service redirects here after login
   * @param appId App id registered in config, passed from `auth.login` route
   * @param req
   * @returns Redirects to selected app success or error location
   */
  @Get(LOGIN_CALLBACK_ROUTE)
  @Redirect()
  @ApiUnauthorizedResponse()
  @ApiBadRequestResponse()
  public loginCallback(@Req() req: FReqWithSession<BasicSessionData>, @Query('redirect_id') redirectId?: string): AR<RedirectResult> {
    return this.getAppMeta().onOk(async (appMeta) => {
      return this.callOpenIdCallback(req, redirectId)
        .onOk((tokenSet) => {
          return this.createSession(tokenSet, req).onOk(() => {
            let redirectUri = new URL(appMeta.redirect.baseUri);
            if (redirectId && appMeta.redirect.loginRequest[redirectId]) {
              redirectUri = new URL(appMeta.redirect.loginRequest[redirectId]);
              redirectUri.searchParams.set('login_request_status', 'ok');
            }

            return OK(RedirectResult.found(redirectUri.toString()));
          });
        })
        .onErr((e) => {
          this.logger.log(e);
          let redirectUri: URL = null;
          if (redirectId && appMeta.redirect.loginRequest[redirectId]) {
            redirectUri = new URL(appMeta.redirect.loginRequest[redirectId]);
            redirectUri.searchParams.set('login_request_status', 'error');
          } else {
            redirectUri = new URL('?error_type=user.infra.auth.openid.login', appMeta.redirect.errorUri);
          }

          return OK(RedirectResult.found(redirectUri.toString()));
        });
    });
  }

  protected callOpenIdCallback(req: FReqWithSession<BasicSessionData>, redirectId?: string): AR<TokenSet> {
    const params = this.client.callbackParams(req.url);
    const originRedirectUri = this.getRedirectLoginCallbackUri(redirectId);
    return P(this.client.callback(originRedirectUri, params));
  }

  protected createSession(tokenSet: TokenSet, req: FReqWithSession<BasicSessionData>): AR<boolean> {
    const auth = new RawJwtSet(
      new RawJwt(tokenSet.access_token, DateTime.cs(tokenSet.expires_at)),
      new RawJwt(tokenSet.refresh_token, this.ct.now.plus(Duration.ofSeconds(DEFAULT_REFRESH_TOKEN_MAX_AGE))),
    );

    const claims = tokenSet.claims();
    return BasicSessionUser.c({userId: claims.sub}).onOkA((user) => {
      if (req.session) {
        req.session.data.auth = auth;
        req.session.data.user = user;
        return OKA(true);
      } else {
        const sessionData = new BasicSessionData(auth, user);
        return this.sessionService.create(req, sessionData);
      }
    });
  }

  /**
   * Logout route - for logout from whole system
   */
  @Post('protected/auth/logout')
  @Redirect()
  @UseGuards(SessionGuard)
  @ApiUnauthorizedResponse()
  public logout(@Req() req: FReqWithSession<BasicSessionData>): AR<RedirectResult> {
    return this.getAppMeta().onOk(() => {
      const redirectUri = this.getRedirectLogoutCallbackUri();
      const endSessionUrl = this.client.endSessionUrl({
        post_logout_redirect_uri: redirectUri,
        id_token_hint: req.session.data.auth.access.value,
      });

      req.session.markToDelete();

      return OK(RedirectResult.found(endSessionUrl));
    });
  }

  @Get('protected/auth/logout-callback')
  @Redirect()
  public logoutCallback(): AR<RedirectResult> {
    return this.getAppMeta().map((appMeta) => {
      const uri = appMeta.redirect.logoutUri;
      return RedirectResult.found(uri);
    });
  }

  private getAppMeta(): AR<OpenIdAppMeta> {
    return OKA(this.options.app);
  }

  private getRedirectLoginCallbackUri(redirectId?: string): string {
    const queryParams = redirectId ? '?redirect_id=' + redirectId : '';
    return this.getRedirectUri('/user/' + LOGIN_CALLBACK_ROUTE + queryParams, this.options.baseUri);
  }

  private getRedirectLogoutCallbackUri(): string {
    return this.getRedirectUri('/user/' + LOGOUT_CALLBACK_ROUTE, this.options.baseUri);
  }

  private getRedirectUri(uri: string, base?: string): string {
    return new URL(uri, base).toString();
  }
}
