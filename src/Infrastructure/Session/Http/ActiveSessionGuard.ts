import { OK, type SAR } from '@hexancore/common';
import { Injectable } from '@nestjs/common';
import type { SessionData } from '../Data';
import { Session } from '../Session';
import { AbstractSessionGuard } from './AbstractSessionGuard';

@Injectable()
export class ActiveSessionGuard extends AbstractSessionGuard {

  protected canActivateWithSession<D extends SessionData = any>(session: Session<D>): SAR<boolean> {
    return OK(session.isActive());
  }

}
