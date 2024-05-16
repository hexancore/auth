import { SessionData } from "@";
import { AuthSessionErrors } from "@/Infrastructure/Session/AuthSessionErrors";
import { AppErrorCode, ERR, OK, type R } from "@hexancore/common";

export class TestSessionData extends SessionData {
  public constructor(public field: string = 'test', public auth = false, public groupId?: string) {
    super();
    return this.proxify();
  }

  public static c(plain: any): R<TestSessionData> {
    if (typeof plain?.field !== 'string') {
      return ERR(AuthSessionErrors.session_data_create_from_plain, AppErrorCode.INTERNAL_ERROR, {
        field: 'missing',
      });
    }
    return OK(new TestSessionData(plain.field, plain.auth, plain.groupId));
  }

  public getSessionGroupId(): string | null {
    return this.sessionGroupId;
  }

  public isAuthenticated(): boolean {
    return this.auth;
  }

  public toJSON(): Record<string, any> {
    return {
      field: this.field,
      auth: this.auth,
      groupId: this.groupId,
    };
  }
}