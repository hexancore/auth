import { nanoid } from 'nanoid';
import { SessionState } from './SessionState';
import { DateTime } from '@hexancore/common';
import { SessionData } from './Data/SessionData';

const ID_SIZE = 21;

export class Session<D extends SessionData> {
  public createdAt?: DateTime;
  public expireAt?: DateTime;
  public data?: D;

  public constructor(public id: string, public state: SessionState) {}

  public static createNew<D extends SessionData>(data: D, createdAt: DateTime, expireAt: DateTime): Session<D> {
    const s = new this<D>(this.genId(), SessionState.CREATED);
    s.data = data;
    s.createdAt = createdAt;
    s.expireAt = expireAt;

    return s;
  }

  public static genId(): string {
    return nanoid(ID_SIZE);
  }

  public static createDeleted<D extends SessionData>(id: string): Session<D> {
    const s = new this<D>(id, SessionState.DELETED);
    s.expireAt = DateTime.cs(0);

    return s;
  }

  public static isValidId(id: any): boolean {
    return id && /^[A-Za-z0-9_-]{21}$/.test(id);
  }

  public markToDelete(): void {
    this.state = SessionState.DELETED;
  }

  public setActive(): void {
    this.state = SessionState.ACTIVE;
  }

  public isCreated(): boolean {
    return this.state === SessionState.CREATED;
  }

  public isActive(): boolean {
    return this.state === SessionState.ACTIVE;
  }

  public isDeleted(): boolean {
    return this.state === SessionState.DELETED;
  }
}
