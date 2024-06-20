
import fastifyMiddie from '@fastify/middie';
import fastify, { FastifyHttp2Options, FastifyHttp2SecureOptions, FastifyHttpsOptions, FastifyListenOptions, FastifyServerOptions, type FastifyInstance } from 'fastify';
import Provider, { type Configuration } from 'oidc-provider';
import { exit } from 'process';

export interface TestOpenIdProviderServerOptions {
  issuer?: string;
  https?: boolean;
  providerConfiguration: Configuration;
  listen: FastifyListenOptions;
  server?: FastifyHttp2Options<any> | FastifyHttp2SecureOptions<any> | FastifyHttpsOptions<any> | FastifyServerOptions<any>;
}

export const DEFAULT_TEST_KEY = `
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCVxYmx9/yiG1rM
1zO4UDKbNHciCjEcpZJQyeudEMep4hOopbvtPUIF+yxdQjsQdo3fte0hKQfPvDOA
aGKIQExbXQyWweHjjxe1ipJiOMOiBj1tahId9UlMNw4ncMFBNMb7RlGJpbPCJ77l
uUELreGY04/yHnMCoKoB1l/LXCBDTrxGxt1CgxmKRcyQyVOceTgMaxpaH/4bAWef
EabktFrG/CnGMGo+CFWiEtnWItwTVNk+zJ1aykB1iwNWN1Bs3u5wOeOMyAanLv30
7SszCPGEu5mts18QABmyEWyBuS6D/dtgeP+BX99BUoVQ2YI89fNTUL6uA1YY5ClX
/hDH0CMDAgMBAAECggEAL5bM4dfCVmAKwfu/W1lgOyC4mgBTCp8xlqoSS54BU2Ga
jYPb6s4EJJJizl81FU4WVncgGeFHsiJC2xJP/Ksxl/ZBAcYpWH0nM3AMg1k2EE2b
RyDlEM/Xsnfr72xMe8OhVkZJsksMiyzF44ixulxNypmuq2gxcyxJ2LudRKjJN5lY
geLgJ5tjI4nuio5FrpWLRHbg9umdThAL8O36Mvyib7oMD6f7gVpLauiq8aylh7O3
yicqhrMHaPHDuVv0pgi+mKQMl1R9MkiQK0WKLvSuVk9lLX+qu/vHmu1nH89fzBEH
0wqAE88sqDw3wNNePgiQ/Jfl/h5dRN80Xb+emW/igQKBgQDLkWsw5vqyfsFwaQLu
MP2vjY7gIwAmqGi+D9FiZJWAYWCscqqoxFHajAfA4Q7vkplPZqc+UF/OrX45Zwgr
wd+AXluxWIDE8Rj1Gkmkq3p9uaQyMTHRkIchTG8ap0yAXNEO8Tc7rsXqNWx6+cdf
hCNNnWdHF6N26ERDXej1gvFK2QKBgQC8WPe5/1ZPQgmxwui3exSKPbo7B34B1vGk
iCV6e1DYeYRUyTIFz5kEHoyl9axGVutXhCtpS41hmoAX+/kstUINksUNk8LTFbU6
3bc59Z80a5+SzDTvzRZhpTQlCm/VDnq9oeCoNSfE9iclnm7jqeN6FDeGEaY/VaWW
WjfFGmcbOwKBgCis0tU/oeIej7pNUUeUxGvahizk8XfH+L3ZXUYiwPiY/H8Ynl8A
czaO+lGg5qIaEcYaxdoepzYd1nXTz38myujUcc/a1kgDwK/g48wic2RBvrxEtiag
kU+m/SA/Q3r2kNNCgX3Ma0FkEVv1ItBED+XHSMacw43T1Sf80LqVwm7pAoGAbB0Z
nh+OeJJspChAk0nIQY4rP0UOtJmgPZSVBtiQUKJ4Ln8LAsDmkbHDhGQgDoRINQU+
MgPXVQZtrtbJcjtdfhMYn7GIrMgSLockbNWsHFgG0in73Qa5aTV+WCDEjuTv2bh5
D7Trbijp0bM+7doQJHxEXuX0qvhLw6Fnz/FW7A8CgYEApY3Qlx/sJe3UsOfkxcWL
CIi+JejSCx+OdDVQUKVEho9FM8EyQStqT1VY8aMGyQUJJU+xN/fKWvFuhcWlTUFR
wzR7yzlmaWuKzCUUDGI21vqEz+zUIaw/U27Ddgdsh3FIfZrcrY0WP3hdCHYLCDWU
gzoeETX/9PHA8Egqc5qyINc=
-----END PRIVATE KEY-----
`;

export const DEFAULT_TEST_CERT = `
-----BEGIN CERTIFICATE-----
MIIDZTCCAk2gAwIBAgIUYsA/xAJpFOU/D3LgjXS1G1bbiHowDQYJKoZIhvcNAQEL
BQAwQjELMAkGA1UEBhMCWFgxFTATBgNVBAcMDERlZmF1bHQgQ2l0eTEcMBoGA1UE
CgwTRGVmYXVsdCBDb21wYW55IEx0ZDAeFw0yNDA1MDcwNTMxMTVaFw0yNDA2MDYw
NTMxMTVaMEIxCzAJBgNVBAYTAlhYMRUwEwYDVQQHDAxEZWZhdWx0IENpdHkxHDAa
BgNVBAoME0RlZmF1bHQgQ29tcGFueSBMdGQwggEiMA0GCSqGSIb3DQEBAQUAA4IB
DwAwggEKAoIBAQCVxYmx9/yiG1rM1zO4UDKbNHciCjEcpZJQyeudEMep4hOopbvt
PUIF+yxdQjsQdo3fte0hKQfPvDOAaGKIQExbXQyWweHjjxe1ipJiOMOiBj1tahId
9UlMNw4ncMFBNMb7RlGJpbPCJ77luUELreGY04/yHnMCoKoB1l/LXCBDTrxGxt1C
gxmKRcyQyVOceTgMaxpaH/4bAWefEabktFrG/CnGMGo+CFWiEtnWItwTVNk+zJ1a
ykB1iwNWN1Bs3u5wOeOMyAanLv307SszCPGEu5mts18QABmyEWyBuS6D/dtgeP+B
X99BUoVQ2YI89fNTUL6uA1YY5ClX/hDH0CMDAgMBAAGjUzBRMB0GA1UdDgQWBBQi
Wh61DGfhM4LdTj3I/b98URzOPTAfBgNVHSMEGDAWgBQiWh61DGfhM4LdTj3I/b98
URzOPTAPBgNVHRMBAf8EBTADAQH/MA0GCSqGSIb3DQEBCwUAA4IBAQADupurZM6W
Oty+aOUu9n/Tc5TmquudrKxp7ChqXPSPyxj5pnvPvBeWP4yRAzCLOTEqzc+AyBEr
ZUgNop6DiR5/fEn1HDASjjaGn8LbeIp/YfWuANLrCZnVDyzv/YipJ1jrNeMUoxd3
/b1Oi+2E7y3rE11tJSOYfvHTbALe7j0go0BohlJuFyvZTEQLEKzzybs8aqYqliCR
DQq++U2Mi7lDMcY1qV//pZwgKqjwYyGVZvAUfntGCk1BQmh0RQAVzVxJZn6qUcYH
98PrKT+aVhndAP5SvI61v/Yq9bBz5q1DGu0W9LFs5eDMaOUMWzWeXk1hdQTuwPt3
e8C19hnuQzrT
-----END CERTIFICATE-----
`;

export class TestOpenIdProviderServer {
  public constructor(protected options: TestOpenIdProviderServerOptions) {
    options.https = options.https !== undefined ? options.https : false;
    this.options.issuer = this.options.issuer ?? `${this.options.https ? 'https' : 'http'}://${this.options.listen.host}:${this.options.listen.port}`;
    options.https = this.options.issuer.startsWith('https');

    options.server = options.server ?? {};

    if (options.https) {
      options.server['https'] = {
        key: options.server['https']?.key ? options.server['https']?.key : DEFAULT_TEST_KEY,
        cert: options.server['https']?.cert ? options.server['https']?.cert : DEFAULT_TEST_CERT,
      };
    }
  }

  public async listen(): Promise<void> {
    try {
      const oidc = new Provider(this.options.issuer, this.options.providerConfiguration);

      const app = await this.createFastify();
      app.use('/oidc', oidc.callback());
      app.get('/health', () => 'OK');

      await app.listen(this.options.listen);
    } catch (e) {
      console.error(e);
      exit(1);
    }
  }

  private async createFastify(): Promise<FastifyInstance> {

    const app: FastifyInstance = fastify(this.options.server);
    await app.register(fastifyMiddie as any, {
      hook: 'onRequest'
    });

    return app;
  }

  public getIssuerDiscover(): string {
    return `${this.getBaseUrl()}/oidc/.well-known/openid-configuration`;
  }

  public getBaseUrl(): string {
    return this.options.issuer!;
  }

  public isHttps(): boolean {
    return this.options.https!;
  }
}
