import { AR, CurrentTime, ERRA, Logger, OK, OKA, getLogger } from '@hexancore/common';
import { FReqWithSession } from './SessionInterceptor';
import { Session } from './Session';
import { SessionStore } from './Store/SessionStore';
import { SessionData } from './Data/SessionData';
import { SessionState } from './SessionState';
import { Duration } from '@js-joda/core';

export class SessionService<D extends SessionData> {
  private sessionInitialDuration: Duration;
  private logger: Logger;

  public constructor(private ct: CurrentTime, private store: SessionStore<D>, initialDuration: number | string) {
    this.sessionInitialDuration = typeof initialDuration === 'number' ? Duration.ofSeconds(initialDuration) : Duration.parse('PT' + initialDuration);
    this.logger = getLogger('core.infra.auth.session.service');
  }

  public create(req: FReqWithSession<D>, data: D): AR<boolean> {
    if (req.session) {
      return ERRA('core.infra.auth.session.create_on_exists');
    }

    const createdAt = this.ct.now;
    const expireAt = createdAt.plus(this.sessionInitialDuration);
    req.session = Session.createNew(data, createdAt, expireAt);
    
    return this.store.persist(req.session).onOk(() => {
      this.logger.info('Created session', { id: req.session.id, expireAt: req.session.expireAt });
      return OK(true);
    });
  }

  public persist(session: Session<D>): AR<boolean> {
    if (session.isCreated() || (session.isActive() && session.data.__modified)) {
      return this.store.persist(session).onOk(() => {
        session.state = SessionState.ACTIVE;
        return OK(true);
      });
    }

    return OKA(true);
  }

  public get(id: string): AR<Session<D>> {
    return this.store.get(id).map((s) => {
      if (!s) {
        return Session.createDeleted(id);
      }
      s.state = SessionState.ACTIVE;
      return s;
    });
  }

  public delete(id: string): AR<boolean> {
    return this.store.delete(id).onOk(() => {
      this.logger.info('Deleted session', { id });
      return OK(true);
    });
  }
}
