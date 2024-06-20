import type { Provider } from "@nestjs/common";
import type { SessionCookieOptions } from "./Http";
import type { ValidationSchema } from "fastest-validator";

const DEFAULT_SESSION_COOKIE_SIGN_SECRET_PATH = 'core.auth.session.cookie.sign';

export const SessionConfigValidationSchema: ValidationSchema = {
  lifetime: { type: 'string', default: '8H' },
  initialLifetime: { type: 'string', default: '5m' },
  cookie: {
    type: "object",
    strict: true,
    props: {
      name: { type: 'string', default: 'SID' },
      httpOnly: { type: 'boolean', default: true },
      sameSite: { type: 'string', default: 'strict' },
      secure: { type: 'boolean', default: true },
      path: { type: 'string', default: '/' },
      domain: { type: 'string', optional: true },
      sign: {
        type: 'object',
        strict: true,
        default: { enabled: true, secretPath: DEFAULT_SESSION_COOKIE_SIGN_SECRET_PATH },
        props: {
          enabled: { type: 'boolean', default: true },
          secretPath: { type: 'string', default: DEFAULT_SESSION_COOKIE_SIGN_SECRET_PATH }
        }
      }
    }
  },
};

export const DEFAULT_SESSION_MODULE_CONFIG_PATH = 'core.auth.session';
export interface SessionModuleOptions {
  configPath?: string,
}

export const SESSION_MODULE_CONFIG_TOKEN = 'HC_AUTH_SESSION_MODULE_CONFIG';
export interface SessionModuleConfig {
  /**
     * Number of seconds or in ISO8601 format after PT like: 7H, 3H30S, 50M
     */
  initialLifetime: string | number;
  cookie: SessionCookieOptions
}

export interface SessionModuleExtras {
  store: Provider;
  interceptorPriority?: number;
}
export const DEFAULT_INTERCEPTOR_PRIORITY = 1000000;
export const DEFAULT_SESSION_MODULE_EXTRAS: SessionModuleExtras = {
  store: null as any,
  interceptorPriority: DEFAULT_INTERCEPTOR_PRIORITY,
};