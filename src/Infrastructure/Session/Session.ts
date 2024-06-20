import { customAlphabet } from 'nanoid';
import { SessionState } from './SessionState';
import { DateTime } from '@hexancore/common';
import { SessionData } from './Data/SessionData';
import { Duration } from '@js-joda/core';
import { sha256 } from '../../Util';

export const SESSION_ID_LENGTH = 21;
export const sessionIdFactory = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz', SESSION_ID_LENGTH);

export interface SessionLogContext {
  id: string;
  state: string;
  createdAt?: string;
  expireAt?: string;
  groupId?: string;
  isAuthenticated: boolean,
  data?: Record<string, any>;
}

/**
 * Represents application session, can be grouped by common id like user id
 */
export class Session<D extends SessionData> {
  /**
   * @internal
   */
  public needRegisterInSessionGroup = false;

  public createdAt?: DateTime;
  public expireAt?: DateTime;
  public data?: D;

  public forceRenewCookie = false;

  public constructor(public id: string, public state: SessionState) { }

  public static createNew<D extends SessionData>(data: D, createdAt: DateTime, expireAt: DateTime): Session<D> {
    const s = new this<D>(this.genId(), SessionState.NEW);
    s.data = data;
    s.createdAt = createdAt;
    s.expireAt = expireAt;
    s.forceRenewCookie = true;

    return s;
  }

  public static createDuration(duration: number | string | Duration): Duration {
    if (duration instanceof Duration) {
      return duration;
    }

    return typeof duration === 'number' ? Duration.ofSeconds(duration) : Duration.parse('PT' + duration);
  }

  public static genId(): string {
    return sessionIdFactory(SESSION_ID_LENGTH);
  }

  public static isValidId(id: any): boolean {
    return id && /^[A-Za-z0-9_]{21}$/.test(id);
  }

  public static createTerminated<D extends SessionData>(id: string): Session<D> {
    const s = new this<D>(id, SessionState.TERMINATED);
    s.createdAt = DateTime.cs(0);
    s.expireAt = DateTime.cs(0);

    return s;
  }

  public static createInvalid<D extends SessionData>(): Session<D> {
    const s = new this<D>('invalid', SessionState.TERMINATED);
    s.createdAt = DateTime.cs(0);
    s.expireAt = DateTime.cs(0);

    return s;
  }

  public isAuthenticated(): boolean {
    return (this.isActive() && this.data && this.data.isAuthenticated()) as boolean;
  }

  public getSessionGroupId(): string | null {
    return this.data ? this.data.sessionGroupId : null;
  }

  public expandLifetime(duration: number | string | Duration): void {
    duration = Session.createDuration(duration);
    this.expireAt = this.expireAt!.plus(duration);
    this.forceRenewCookie = true;
  }

  public isExpired(now: DateTime): boolean {
    return this.expireAt!.isAfter(now);
  }

  public terminate(): void {
    this.state = SessionState.TERMINATED;
  }

  public markToTerminate(): void {
    this.state = SessionState.TO_TERMINATE;
  }

  public markAsActive(): void {
    this.state = SessionState.ACTIVE;
  }

  public isNew(): boolean {
    return this.state === SessionState.NEW;
  }

  public isActive(): boolean {
    return this.state === SessionState.ACTIVE;
  }

  public isToTerminate(): boolean {
    return this.state === SessionState.TO_TERMINATE;
  }

  public isTerminated(): boolean {
    return this.state === SessionState.TERMINATED;
  }

  public get needSave(): boolean {
    return this.isNew() || (this.isActive() && this.data!.__modified === true);
  }

  public get needRenewCookie(): boolean {
    return this.isNew() || this.forceRenewCookie;
  }

  /**
   * Returns safe log representation of session
   * @returns
   */
  public toLogContext(): SessionLogContext {
    return {
      id: Session.idToLogContext(this.id),
      state: this.state.toString(),
      isAuthenticated: this.isAuthenticated(),
      createdAt: this.createdAt ? this.createdAt.formatDateTime() : undefined,
      expireAt: this.expireAt ? this.expireAt.formatDateTime() : undefined,
      groupId: this.getSessionGroupId() ?? undefined,
      data: this.data ? this.data.toLogContext() ?? undefined : undefined,
    };
  }

  public static idToLogContext(id: string): string {
    return sha256(id);
  }
}
