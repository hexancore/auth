import { AR } from '@hexancore/common';
import { Session } from '../Session';
import { SessionData } from '../Data/SessionData';

export interface SessionStore<D extends SessionData> {
  save(session: Session<D>): AR<boolean>;
  get(id: string): AR<Session<D> | null>;
  delete(id: string, groupId?: string): AR<boolean>;

  getInGroup(groupId: string): AR<Session<D>[]>;
  getIdsInGroup(groupId: string): AR<string[]>;
  deleteGroup(groupId: string): AR<boolean>;
}
