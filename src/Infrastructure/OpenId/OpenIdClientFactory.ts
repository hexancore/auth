import { AR, ARW, ERR, P, RetryHelper, getLogger, type Logger } from '@hexancore/common';
import { Client, Issuer } from 'openid-client';

export interface OpenIdClientFactoryOptions {
  issuerDiscover: string | {
    issuer: string;
    retry: {
      maxAttempts?: number;
      delay?: number;
      delayAttemptMultipler?: number;
      maxAttemptDelay?: number;
    }

  };
  clientId: string;
  clientSecret: string;
  defaultMaxAge?: number
}

export class OpenIdClientFactory {
  private log: Logger;

  public constructor() {
    this.log = getLogger('core.auth.infra.openid', ['core', 'auth', 'openid']);
  }
  public create(options: OpenIdClientFactoryOptions): AR<Client> {
    const retryOptions = this.createRetryOptions(options);
    return RetryHelper.retryAsync(() => this.tryDiscover(options), {
      id: `OpenIdClientFactory[${options.clientId}]`,
      maxAttempts: retryOptions.maxAttempts,
      retryDelay: this.createDiscoverRetryFn(retryOptions)
    });
  }

  private createRetryOptions(options: OpenIdClientFactoryOptions) {
    const retryOptions = {
      maxAttempts: 5,
      delay: 5000,
      delayAttemptMultipler: 2 * 1000,
      maxAttemptDelay: 30 * 1000,
    };

    if (typeof options.issuerDiscover === 'object') {
      retryOptions.maxAttempts = options.issuerDiscover.retry.maxAttempts ?? retryOptions.maxAttempts;
      retryOptions.delay = options.issuerDiscover.retry.delay ?? retryOptions.delay;
      retryOptions.delayAttemptMultipler = options.issuerDiscover.retry.delayAttemptMultipler ?? retryOptions.delayAttemptMultipler;
      retryOptions.maxAttemptDelay = options.issuerDiscover.retry.maxAttemptDelay ?? retryOptions.maxAttemptDelay;
    }

    return retryOptions;
  }

  private createDiscoverRetryFn(options: any) {
    return (attempt: number, maxAttempts: number): Promise<void> => {
      const nextDelay = Math.min(options.delay + attempt * options.delayAttemptMultipler, options.maxAttemptDelay);
      this.log.warn(`Retry discover OIDC Provider, nextDelay: ${nextDelay}ms`, { nextDelay, attempt, maxAttempts });
      return new Promise((resolve) => setTimeout(resolve, nextDelay));
    };
  }

  private tryDiscover(options: OpenIdClientFactoryOptions): AR<Client> {
    const discoverUrl = typeof options.issuerDiscover === 'string' ? options.issuerDiscover : options.issuerDiscover.issuer;
    return ARW(Issuer.discover(discoverUrl))
      .onOk((issuer) => {
        return this.createClientFromIssuer(options, issuer);
      });
  }

  private createClientFromIssuer(options: OpenIdClientFactoryOptions, issuer: Issuer): Client {
    return new issuer.Client({
      client_id: options.clientId,
      client_secret: options.clientSecret,
      id_token_signed_response_alg: "RS256",
      authorization_signed_response_alg: "RS256",
      userinfo_signed_response_alg: "RS256",
      request_object_signing_alg: "RS256",
      token_endpoint_auth_signing_alg: "RS256",
      revocation_endpoint_auth_signing_alg: "RS256",
      introspection_endpoint_auth_signing_alg: "RS256",
      default_max_age: options.defaultMaxAge,
    });
  }
}
