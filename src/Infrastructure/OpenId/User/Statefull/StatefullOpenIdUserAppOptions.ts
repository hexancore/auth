import type { OpenIdUserAppOptions } from '../OpenIdUserAppOptions';

export interface StatefullOpenIdUserAppOptions extends OpenIdUserAppOptions {
  session?: {
    lifetime: string
  }
}