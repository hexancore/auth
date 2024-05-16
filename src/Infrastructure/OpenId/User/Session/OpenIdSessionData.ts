import { sha256 } from '../../../../Util';
import { OK, R, Result, UserId } from '@hexancore/common';
import { SessionData } from '../../../Session/Data';
import { OpenIdAuthRequestData } from './OpenIdAuthRequestData';
import { OpenIdAuthData as OpenIdAuthData } from './OpenIdAuthData';

export const OpenIdSessionDataCreateError = 'core.auth.infra.openid.user.session.openid_session_data_create';

export class OpenIdUserSessionData extends SessionData {
  private metadata: Map<string, any>;

  public constructor(
    /**
     * Sets when user start login interaction
     */
    public authRequest: OpenIdAuthRequestData = null,
    /**
     * Sets when user successfull authenticated
     */
    public auth: OpenIdAuthData = null,
    metadataEntries: [string, any][] = [],
  ) {
    super();
    this.metadata = new Map(metadataEntries);
    return this.proxify();
  }

  public static createInAuthRequestState(authRequest: OpenIdAuthRequestData): OpenIdUserSessionData {
    return new this(authRequest);
  }

  public static c(plain: Record<string, any>): R<OpenIdUserSessionData> {
    return Result.all({
      authRequest: plain?.authRequest ? OpenIdAuthRequestData.c(plain?.authRequest) : OK(null),
      auth: plain?.auth ? OpenIdAuthData.c(plain?.auth) : OK(null),
      metadata: plain?.metadata ? OK(plain?.metadata) : OK([]),
    }, OpenIdSessionDataCreateError).onOk((v) => {
      return new OpenIdUserSessionData(v.authRequest, v.auth, v.metadata);
    });
  }

  public setAsAuthenticated(auth: OpenIdAuthData): void {
    this.authRequest = null;
    this.auth = auth;
  }

  public getClaim<T>(claim: string, defaultValue: T = null): T | null {
    return this.isAuthenticated() ? this.auth.claims[claim] : defaultValue;
  }

  public getMetadata<T>(key: string): T | null {
    return this.metadata.get(key);
  }

  public setMetadata(key: string, value: any): void {
    this.metadata.set(key, value);
    this.__markPropertyAsModified('metadata');
  }

  public deleteMetadata(key: string): void {
    this.metadata.delete(key);
    this.__markPropertyAsModified('metadata');
  }

  public get userId(): UserId | null {
    return this.isAuthenticated() ? this.auth.userId : null;
  }

  public get sessionGroupId(): string | null {
    return this.userIdHash;
  }

  public get userIdHash(): string | null {
    return this.isAuthenticated() ? sha256(this.userId.toString()) : null;
  }

  public isAuthenticated(): boolean {
    return this.auth !== null;
  }

  public toJSON(): Record<string, any> {
    return {
      authRequest: this.authRequest ? this.authRequest : undefined,
      auth: this.auth,
      metadata: Array.from(this.metadata.entries()),
    };
  }

  public toLogContext(): Record<string, any> {
    return {
      hasAuthRequest: this.authRequest !== null,
      userId: this.userIdHash
    };
  }
}
