import { AR, P } from '@hexancore/common';
import { Client, Issuer } from 'openid-client';

export interface OpenIdClientFactoryOptions {
  issuerDiscover: string;
  clientId: string;
  secretId: string;
}
export class OpenIdClientFactory {

  public create(options: OpenIdClientFactoryOptions): AR<Client> {
    return P(Issuer.discover(options.issuerDiscover)).map(
      (issuer) =>
        new issuer.Client({
          client_id: options.clientId,
          client_secret: options.secretId,
          id_token_signed_response_alg: "ES256",
          authorization_signed_response_alg: "ES256",
          userinfo_signed_response_alg: "ES256",
          request_object_signing_alg: "ES256",
          token_endpoint_auth_signing_alg: "ES256",
          revocation_endpoint_auth_signing_alg: "ES256",
          introspection_endpoint_auth_signing_alg: "ES256"
        }),
    );
  }
}
