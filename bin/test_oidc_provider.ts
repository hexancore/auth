#!/usr/bin/env tsx

import fs from 'fs';
import yaml from 'js-yaml';
import { MockOpenIdConfigurationBuilder, TestOpenIdProviderServer } from '../lib/Test';
import type { ClientMetadata } from 'oidc-provider';

interface TestProviderConfig {
  issuer?: string;
  listen?: {
    host?: string;
    port?: number;
  };
  https?: boolean;
  server: {
    https: {
      key: string | Buffer;
      cert: string | Buffer;
    }
  }
  clients: (ClientMetadata & { flow_type?: 'authorization_code' })[]
}

const DEFAULT_CONFIG_PATH = './config/dev/test_oidc_provider.yaml';

function bootstrap(): Promise<void> {
  const configFile = process.argv.length >= 3 ? process.argv[2] : DEFAULT_CONFIG_PATH;
  if (!fs.existsSync(configFile)) {
    console.error(`Missing config file path, default: '${DEFAULT_CONFIG_PATH}', or custom: pnpm hc_auth_test_oidc_provider <config.yaml>`);
    process.exit(1);
  }

  console.log(`Reading config from file: ${configFile}`);
  const config: TestProviderConfig = yaml.load(fs.readFileSync(configFile, 'utf8')) as TestProviderConfig;

  const providerConfigurationBuilder = MockOpenIdConfigurationBuilder.create();

  config.clients.forEach(c => {
    c.client_secret = c.client_secret ?? 'test_secret';
    if (c.flow_type === 'authorization_code') {
      providerConfigurationBuilder.addAuthorizationCodeClient(c);
    } else {
      providerConfigurationBuilder.addClient(c);
    }
  });
  const providerConfiguration = providerConfigurationBuilder.build();

  config.listen = {
    host: 'localhost',
    port: 20021,
    ...(config.listen ?? {})
  };

  if (config.server) {
    config.server.https.key = fs.readFileSync(config.server.https.key);
    config.server.https.cert = fs.readFileSync(config.server.https.key);
  }

  const server = new TestOpenIdProviderServer({
    issuer: config.issuer,
    providerConfiguration: providerConfiguration,
    listen: config.listen,
    server: config.server,
    https: config.https,
  });

  const logProviderInfo = [
    `Provider:`,
    `  IssuerDiscover: ${server.getIssuerDiscover()}`,
    `  Clients:`,
    config.clients.map(v => JSON.stringify(v, null, 6).split('\n').map(l => l.padStart(4, ' ')).join('\n')).join('\n'),
  ].join("\n");

  console.log(logProviderInfo);

  return server.listen();
}

bootstrap();
