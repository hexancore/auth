import type { FReqWithSession } from '../../../Session';
import type { OpenIdUserSessionData } from './OpenIdSessionData';

export * from './OpenIdAuthRequestData';
export * from './OpenIdAuthData';
export * from './OpenIdSessionData';

export type FReqWithOpenIdSession = FReqWithSession<OpenIdUserSessionData>;