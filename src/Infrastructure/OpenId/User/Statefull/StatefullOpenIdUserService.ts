import { ARW, type AR } from "@hexancore/common";
import { Duration } from '@js-joda/core';
import { Inject, Injectable } from "@nestjs/common";
import { Client, generators, type OpenIDCallbackChecks } from "openid-client";
import { OpenIdAuthData, type StatefullOpenIdUserAppOptions } from "../../..";
import { Session } from "../../../Session";
import { OpenIdUserAppOptionsToken, OpenIdUserClientToken as OpenIdUserClientToken } from "../Constants";
import type { OpenIdUserSessionData } from "../Session";
import { OpenIdAuthRequestData } from "../Session/OpenIdAuthRequestData";

export const BASE_USER_MODULE_ROUTE = '/user';
export const LOGIN_CALLBACK_ROUTE = 'protected/auth/login-callback';
export const LOGOUT_CALLBACK_ROUTE = 'protected/auth/logout-callback';

export interface AuthorizationUrlData {
  url: string,
  authRequestData: OpenIdAuthRequestData,
}

@Injectable()
export class StatefullOpenIdUserService {
  public constructor(
    @Inject(OpenIdUserAppOptionsToken) private options: StatefullOpenIdUserAppOptions,
    @Inject(OpenIdUserClientToken) private client: Client,
  ) {

  }

  public authorizationUrl(redirectId: string): AuthorizationUrlData {
    const state = generators.state();
    const nonce = generators.nonce();
    const codeVerifier = generators.codeVerifier();

    const redirectUri = this.getRedirectLoginCallbackUrl();
    const url = this.client.authorizationUrl({
      redirect_uri: redirectUri,
      scope: this.options.login?.scope ? this.options.login.scope.join(' ') : undefined,
      claims: this.options.login?.claims,
      audience: this.options.login?.audience,
      state: state,
      nonce: nonce,
      code_challenge_method: 'S256',
      code_challenge: generators.codeChallenge(codeVerifier),
      response_type: 'code',
      max_age: this.client.metadata.default_max_age,
    });

    return { url, authRequestData: new OpenIdAuthRequestData(state, nonce, codeVerifier, redirectId) };
  }

  private getRedirectLoginCallbackUrl(): string {
    return this.getAppApiRedirectUrl(LOGIN_CALLBACK_ROUTE);
  }

  public callLoginCallback(url: string, data: OpenIdAuthRequestData): AR<OpenIdAuthData> {
    const params = this.client.callbackParams(url);
    const originRedirectUri = this.getRedirectLoginCallbackUrl();
    const checks: OpenIDCallbackChecks = { code_verifier: data.codeVerifier, nonce: data.nonce, state: data.state };
    return ARW(this.client.callback(originRedirectUri, params, checks))
      .onOk(tokenSet => OpenIdAuthData.createFromTokenSet(tokenSet));
  }

  public endSessionUrl(session: Session<OpenIdUserSessionData>): string {
    const redirectUri = this.getRedirectLogoutCallbackUrl();
    const url = this.client.endSessionUrl({
      post_logout_redirect_uri: redirectUri,
      id_token_hint: session.data!.auth!.idToken.value,
    });

    return url;
  }

  public authenticatedUrl(redirectId: string): string {
    let url = new URL(this.options.redirect.baseUrl);
    if (redirectId && this.options.redirect.loginRequest[redirectId]) {
      url = new URL(this.options.redirect.loginRequest[redirectId]);
      url.searchParams.set('login_request_status', 'ok');
    }

    return url.toString();
  }

  public errorUrl(redirectId: string): string {
    let url: URL;
    if (redirectId && this.options.redirect.loginRequest[redirectId]) {
      url = new URL(this.options.redirect.loginRequest[redirectId]);
      url.searchParams.set('login_request_status', 'error');
    } else {
      url = new URL('?error_type=core.auth.infra.openid.user.login', this.options.redirect.errorUrl);
    }

    return url.toString();
  }

  public getLogoutRedirectUrl(): string {
    return this.options.redirect.postLogoutUrl;
  }

  private getRedirectLogoutCallbackUrl(): string {
    return this.getAppApiRedirectUrl(LOGOUT_CALLBACK_ROUTE);
  }

  private getAppApiRedirectUrl(path: string): string {
    return this.getRedirectUrl(path, this.options.apiBaseUrl + BASE_USER_MODULE_ROUTE + '/');
  }

  private getRedirectUrl(url: string, base?: string): string {
    return new URL(url, base).toString();
  }

  public getSessionLifetimeDuration(): Duration {
    return Session.createDuration(this.options.session!.lifetime);
  }
}