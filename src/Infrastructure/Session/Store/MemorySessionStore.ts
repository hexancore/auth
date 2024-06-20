import { AR, ERRA, OK, OKA, type CurrentTime, type DateTime, type R } from '@hexancore/common';
import { Session } from '../Session';
import { SessionStore } from './SessionStore';
import { SessionData } from '../Data/SessionData';
import { Injectable } from '@nestjs/common';
import { SessionState } from '../SessionState';
import type { SessionDataSerializer } from '../Data';

interface SerializedSession {
  createdAt: DateTime;
  expireAt: DateTime;
  data: Record<string, any>;
}

@Injectable()
export class MemorySessionStore<D extends SessionData> implements SessionStore<D> {
  private sessions: Map<string, SerializedSession>;
  private sessionGroups: Map<string, Set<string>>;

  public constructor(private dataSerializer: SessionDataSerializer<D>, private ct: CurrentTime) {
    this.sessions = new Map();
    this.sessionGroups = new Map();
  }

  public save(session: Session<D>): AR<boolean> {
    return this.serialize(session).onOk((serialized) => {
      this.sessions.set(session.id, serialized);
      if (session.needRegisterInSessionGroup) {
        this.registerInGroup(session);
      }
      return OKA(true);
    }).onErr(e => ERRA(e));
  }

  private serialize(session: Session<D>): R<SerializedSession> {
    return this.dataSerializer.serialize(session.data!).onOk(data => {
      return {
        createdAt: session.createdAt!,
        expireAt: session.expireAt!,
        data,
      };
    });
  }

  private registerInGroup(session: Session<D>): void {
    const groupId = session.data!.sessionGroupId;
    if (!groupId) {
      return;
    }
    const sessionIds = this.sessionGroups.get(groupId) ?? new Set();
    sessionIds.add(session.id);
    this.sessionGroups.set(groupId, sessionIds);
  }

  public get(id: string): AR<Session<D> | null> {
    const value = this.sessions.get(id);
    if (!value) {
      return OKA(null);
    }

    return this.parseValue(id, value)
      .onErr((e) => ERRA(e) as any)
      .onOk(s => {
        if (s.isExpired(this.ct.now)) {
          return this.delete(s.id, s.getSessionGroupId()).onOk(() => null);
        }
        return OKA(s);
      });

  }

  public delete(id: string, groupId?: string): AR<boolean> {
    this.sessions.delete(id);
    if (groupId) {
      const group = this.sessionGroups.get(groupId);
      if (group) {
        group.delete(id);
        if (group.size === 0) {
          this.sessionGroups.delete(groupId);
        }
      }
    }
    return OKA(true);
  }

  public getInGroup(groupId: string): AR<Session<D>[]> {
    return this.getIdsInGroup(groupId).onEachAsArray(id => this.get(id)).onOk((sessions) => sessions.filter((s) => s !== null) as any);
  }

  public getIdsInGroup(groupId: string): AR<string[]> {
    const ids = this.sessionGroups.get(groupId);
    if (!ids) {
      return OKA([]);
    }

    return OKA(Array.from(ids.values()));
  }

  public deleteGroup(groupId: string): AR<boolean> {
    return this.getIdsInGroup(groupId).onEachAsArray(id => this.delete(id)).onOk(() => {
      this.sessionGroups.delete(groupId);
      return OK(true);
    });
  }

  protected parseValue(id: string, serialized: SerializedSession): R<Session<D>> {
    return this.dataSerializer.deserialize(serialized.data).onOk(data => {
      const s = new Session<D>(id, SessionState.ACTIVE);
      s.createdAt = serialized.createdAt;
      s.expireAt = serialized.expireAt;
      s.data = data;
      s.data.__track();
      return s;
    });
  }
}
