import { CurrentTime } from "@hexancore/common";
import { APP_REDIS_TOKEN } from "@hexancore/cloud/redis";
import type { InjectionToken, Provider } from "@nestjs/common";
import { type FromPlainFactory, PlainSessionDataSerializer } from "../Data";
import { MemorySessionStore } from "./MemorySessionStore";
import { RedisSessionStore } from "./Redis/RedisSessionStore";
import type { Cluster, Redis } from "ioredis";

export const SESSION_STORE_TOKEN = 'HC_AUTH_SESSION_STORE';

export function MemorySessionStoreProvider(fromPlainFactory: FromPlainFactory<any>): Provider {
  return {
    provide: SESSION_STORE_TOKEN,
    inject: [CurrentTime],
    useFactory: (ct) => {
      return new MemorySessionStore(new PlainSessionDataSerializer(fromPlainFactory), ct);
    }
  };
}

export function RedisSessionStoreProvider(fromPlainFactory: FromPlainFactory<any>, redisToken?: InjectionToken): Provider {
  redisToken = redisToken ?? APP_REDIS_TOKEN;
  return {
    provide: SESSION_STORE_TOKEN,
    inject: [redisToken],
    useFactory: (redis: Redis | Cluster) => {
      return new RedisSessionStore(redis, new PlainSessionDataSerializer(fromPlainFactory));
    }
  };
}