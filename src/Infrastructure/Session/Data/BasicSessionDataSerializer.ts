import { OK, R} from '@hexancore/common';
import { BasicSessionData } from './BasicSessionData';
import { SessionDataSerializer, SessionDataSerializerErrors } from './SessionDataSerializer';

export class BasicSessionDataSerializer implements SessionDataSerializer<BasicSessionData> {
  public serialize(data: BasicSessionData): R<Record<string, any>> {
    return OK(data.toJSON());
  }

  public deserialize(plain: Record<string, any>): R<BasicSessionData> {
    return BasicSessionData.c(plain).mapErr((e) => ({ type: SessionDataSerializerErrors.deserialize, code: 500, data: e.data }));
  }
}
