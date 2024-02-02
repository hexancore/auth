// auth/auth.controller.ts
import { Controller, Get, Inject, Res, Req, Post, Body } from '@nestjs/common';
import { OK, ERR, R, AR, P, Logger, AppErrorCode, getLogger, OKA, ARW } from '@hexancore/common';
import { ApiBadRequestResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { CookieSerializeOptions } from '@fastify/cookie';

import { Client } from 'openid-client';
import { FResponse, RedirectResult, FRequest } from '@hexancore/core';
import { OpenIdUserStatelessApiOptions } from './OpenIdUserStatelessApiOptions';
import { OpenIdUserApiOptionsToken, OpenIdClientToken, DEFAULT_REFRESH_TOKEN_MAX_AGE } from '../Constants';
import { OpenIdAppMeta } from '../OpenIdAppMeta';

function defaultOptionValue(current: any, defaultValue: any): any {
  return current === undefined ? defaultValue : current;
}

@ApiTags('User')
@Controller({ path: '/user' })
export class OpenIdUserStatelessController {
  protected logger: Logger;

  public constructor(
    @Inject(OpenIdUserApiOptionsToken) private options: OpenIdUserStatelessApiOptions,
    @Inject(OpenIdClientToken) private client: Client,
  ) {
    options.cookie.secure = defaultOptionValue(options.cookie.secure, true);
    options.cookie.signed = defaultOptionValue(options.cookie.signed, true);
    options.cookie.httpOnly = defaultOptionValue(options.cookie.httpOnly, true);

    this.logger = getLogger('user_auth_openid', ['auth']);
  }

  /**
   * Login route - redirects to login page and after login auth service redirects to `auth.login-callback` route
   *
   */
  @Get('auth/login')
  @ApiBadRequestResponse()
  public login(): AR<RedirectResult> {
    return this.getAppMeta().onOk((appMeta) => {
      const redirectUri = this.createRedirectLoginCallbackUri();
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
   * @param res
   * @returns Redirects to selected app success or error location
   */
  @Get('auth/login-callback')
  @ApiUnauthorizedResponse()
  @ApiBadRequestResponse()
  public loginCallback(@Req() req: FRequest, @Res() res: FResponse): AR<RedirectResult> {
    return this.getAppMeta().onOk((appMeta) => {
      const params = this.client.callbackParams(req.url);
      const originRedirectUri = this.createRedirectLoginCallbackUri();
      return ARW(this.client.callback(originRedirectUri, params))
        .onOk((tokenSet) => {
          const maxAge = this.options.cookie.refreshToken.maxAge ?? DEFAULT_REFRESH_TOKEN_MAX_AGE;
          this.setCookie(res, this.options.cookie.refreshToken.name, tokenSet.refresh_token, { maxAge });

          const accessTokenCookieValue = tokenSet.expires_at + ' ' + tokenSet.access_token;
          this.setCookie(res, this.options.cookie.firstAccessToken.name, accessTokenCookieValue, {
            maxAge: this.options.cookie.firstAccessToken.maxAge ?? 60,
          });

          const redirectUri = new URL(appMeta.redirect.baseUri).toString();
          return OK(RedirectResult.found(redirectUri));
        })
        .onErr(() => {
          const redirectUri = new URL('?errorType=user.infra.auth.openid.login', appMeta.redirect.errorUri).toString();
          return RedirectResult.found(redirectUri);
        });
    });
  }

  /**
   * Login Token route - After success login app can get first access token with it
   * @param req
   * @param res
   * @returns
   */
  @Post('auth/login-token')
  @ApiUnauthorizedResponse()
  @ApiBadRequestResponse()
  public loginToken(@Req() req: FRequest, @Res() res: FResponse): R<{ accessToken: string; expiresAt: number }> {
    const cookieName = this.options.cookie.firstAccessToken.name;
    return this.unsignCookie(req, cookieName).onOk((cookieValue) => {
      this.clearCookie(res, cookieName);
      const [expiresAt, accessToken] = cookieValue.split(' ', 2);
      return OK({ accessToken, expiresAt: parseInt(expiresAt) });
    });
  }

  /**
   * Refresh route - refreshes access token
   * @param req
   * @returns
   */
  @Post('auth/refresh')
  @ApiUnauthorizedResponse()
  public refresh(@Req() req: FRequest): AR<{ accessToken: string; expiresAt: number }> {
    const cookieName = this.options.cookie.refreshToken.name;
    return this.unsignCookie(req, cookieName).onOk((cookieValue) =>
      ARW(this.client.refresh(cookieValue))
        .onOk((tokenSet) => ({ accessToken: tokenSet.access_token, expiresAt: tokenSet.expires_at }))
        .onErr(() => ERR({ type: 'user.infra.auth.openid.refresh_token_invalid', code: AppErrorCode.UNAUTHORIZED })),
    );
  }

  /**
   * Logout route - for logout from whole system,
   * @param body
   * @param appId AppId for select logout redirect location
   * @returns
   */
  @Post('auth/logout')
  @ApiUnauthorizedResponse()
  public logout(@Body() body: { accessToken: string }, @Res() res: FResponse): AR<RedirectResult> {
    return this.getAppMeta().onOk(() => {
      const redirectUri = this.createRedirectUri('/user/auth/logout-callback', this.options.baseUri);
      const endSessionUrl = this.client.endSessionUrl({
        post_logout_redirect_uri: redirectUri,
        id_token_hint: body.accessToken,
      });

      this.clearCookie(res, this.options.cookie.refreshToken.name);

      return OK(RedirectResult.found(endSessionUrl));
    });
  }

  @Get('auth/logout-callback')
  @ApiUnauthorizedResponse()
  public logoutCallback(): AR<RedirectResult> {
    return this.getAppMeta().onOk((appMeta) => {
      const uri = appMeta.redirect.logoutUri;
      return RedirectResult.found(uri);
    });
  }

  private getAppMeta(): AR<OpenIdAppMeta> {
    return OKA(this.options.app);
  }

  private createRedirectUri(uri: string, base?: string): string {
    return new URL(uri, base).toString();
  }

  private createRedirectLoginCallbackUri(): string {
    return this.createRedirectUri('/user/auth/login-callback', this.options.baseUri);
  }

  private setCookie(res: FResponse, name: string, value: any, options: CookieSerializeOptions): void {
    options.path = '/';
    options.httpOnly = this.options.cookie.httpOnly;
    options.secure = this.options.cookie.secure;
    options.signed = this.options.cookie.signed;
    options.sameSite = 'strict';
    res.cookie(name, value, options);
  }

  private unsignCookie(req: FRequest, cookieName: string): R<string> {
    const cookieValue = req.cookies[cookieName] ?? '';
    if (!this.options.cookie.signed) {
      return OK(cookieValue);
    }

    const unsignResult = req.unsignCookie(cookieValue);
    if (!unsignResult.valid) {
      return ERR('user.infra.auth.openid.cookie_invalid', 401, { cookieName });
    }

    return OK(unsignResult.value);
  }

  private clearCookie(res: FResponse, name: string): void {
    res.clearCookie(name, {
      path: '/',
      httpOnly: true,
      secure: true,
      signed: this.options.cookie.signed,
      sameSite: 'strict',
    });
  }
}
