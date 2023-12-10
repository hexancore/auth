import { R } from '@hexancore/common';
import { SessionData } from './SessionData';

export const SessionDataSerializerErrors = {
  serialize: 'core.infra.auth.session.data.serialize',
  deserialize: 'core.infra.auth.session.data.deserialize',
};

export interface SessionDataSerializer<D extends SessionData> {
  serialize(data: D): R<Record<string, any>>;
  deserialize(plain: Record<string, any>): R<D>;
}
