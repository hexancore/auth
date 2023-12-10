import { AR } from '@hexancore/common';
import { Session } from '../Session';
import { SessionData } from '../Data/SessionData';

export interface SessionStore<D extends SessionData> {
  get(id: string): AR<Session<D> | null>;
  persist(session: Session<D>): AR<boolean>;
  delete(id: string): AR<boolean>;
}
