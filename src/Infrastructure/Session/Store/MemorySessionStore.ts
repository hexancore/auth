import { AR, OKA } from '@hexancore/common';
import { Session } from '../Session';
import { SessionStore } from './SessionStore';
import { SessionData } from '../Data/SessionData';

export class MemorySessionStore<D extends SessionData> implements SessionStore<D> {
  private sessions: Map<string, Session<D>>;

  public constructor() {
    this.sessions = new Map();
  }

  public get(id: string): AR<Session<D>> {
    return OKA(this.sessions.get(id) ?? null);
  }

  public persist(session: Session<D>): AR<boolean> {
    this.sessions.set(session.id, session);
    return OKA(true);
  }

  public delete(id: string): AR<boolean> {
    this.sessions.delete(id);
    return OKA(true);
  }
}
