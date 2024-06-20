import { AR, CurrentTime, Logger, OK, OKA, getLogger } from '@hexancore/common';
import { Duration } from '@js-joda/core';
import { SessionData } from './Data/SessionData';
import { Session } from './Session';
import { SessionStore } from './Store/SessionStore';

export class SessionService<D extends SessionData> {
  private sessionInitialDuration: Duration;
  private log: Logger;

  public constructor(
    private ct: CurrentTime,
    private store: SessionStore<D>,
    initialLifetime: number | string
  ) {
    this.sessionInitialDuration = Session.createDuration(initialLifetime);
    this.log = getLogger('core.auth.infra.session.service', ['core', 'auth', 'infra', 'session']);
  }

  public create(data: D): Session<D> {
    const createdAt = this.ct.now;
    const expireAt = createdAt.plus(this.sessionInitialDuration);
    const session = Session.createNew(data, createdAt, expireAt);

    this.log.info('Created session', session.toLogContext());
    return session;
  }

  public save(session: Session<D>): AR<boolean> {
    if (session.needSave) {
      const isNew = session.isNew();
      return this.store.save(session).onOk(() => {
        if (isNew) {
          this.log.info('Saved new session', session.toLogContext());
        }
        session.markAsActive();
        session.data!.__track();
        return true;
      });
    }

    return OKA(true);
  }

  /**
   *  Returns session with given id from store or null when not exists
   * @param id
   * @returns
   */
  public get(id: string): AR<Session<D> | null> {
    return this.store.get(id).onOk((s) => {
      if (!s) {
        this.log.info('Session not found', { id: Session.idToLogContext(id) });
        return null;
      }

      s.markAsActive();
      s.data!.__track();
      return s;
    });
  }

  public terminate(session: string | Session<D>): AR<boolean> {
    let groupId;
    if (session instanceof Session) {
      groupId = session.getSessionGroupId();
      session.terminate();
      session = session.id;
    }

    return this.store.delete(session, groupId).onOk(() => {
      this.log.info('Terminated session', { id: Session.idToLogContext(session) });
      return OK(true);
    });
  }

  public getInGroup(groupId: string): AR<Session<D>[]> {
    return this.store.getInGroup(groupId);
  }

  public getIdsInGroup(groupId: string): AR<string[]> {
    return this.store.getIdsInGroup(groupId);
  }

  public terminateGroup(groupId: string): AR<boolean> {
    return this.store.deleteGroup(groupId).onOk(() => {
      this.log.info('Terminated session group', { groupId });
      return true;
    });
  }
}
