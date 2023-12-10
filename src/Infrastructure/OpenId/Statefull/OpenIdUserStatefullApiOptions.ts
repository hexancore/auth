import { OpenIdAppMeta } from '../OpenIdAppMeta';

export interface OpenIdUserStatefullApiOptions {
  type: 'statefull';
  baseUri: string;
  app: OpenIdAppMeta;
}
