import { OK, type SAR } from '@hexancore/common';
import { Injectable } from '@nestjs/common';
import type { SessionData } from '../Data';
import type { Session } from '../Session';
import { ActiveSessionGuard } from './ActiveSessionGuard';

@Injectable()
export class AuthenticatedSessionGuard extends ActiveSessionGuard {

  protected canActivateWithSession<D extends SessionData = any>(session: Session<D>): SAR<boolean> {
    return OK(session.isAuthenticated());
  }
}
