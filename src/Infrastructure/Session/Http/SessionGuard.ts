import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Session } from '../Session';
import type { FReqWithSession } from './types';

@Injectable()
export class SessionGuard implements CanActivate {

  public canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const http = context.switchToHttp();
    const req = http.getRequest<FReqWithSession<any>>();

    if (req.session instanceof Session && req.session.isActive()) {
      return true;
    }

    throw new UnauthorizedException();
  }
}
