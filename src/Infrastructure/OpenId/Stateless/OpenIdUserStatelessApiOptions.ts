import { OpenIdAppMeta } from '../OpenIdAppMeta';

export interface OpenIdUserStatelessApiOptions {
  type: 'stateless';
  baseUri: string;
  cookie: {
    signed: boolean;
    secure: boolean;
    httpOnly: boolean;
    firstAccessToken: {
      name: string;
      maxAge?: number;
    };
    refreshToken: {
      name: string;
      maxAge?: number;
    };
  };
  app: OpenIdAppMeta;
}
