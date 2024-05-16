import { type JsonSerialize } from "@hexancore/common";

export abstract class SessionData implements JsonSerialize {

  /**
   * managed on infrastructure level by persistance layer like typeorm
   */
  public __tracked: boolean;

  /**
   * Tracks property modification
   */
  public __modifiedProperties: Set<string>;

  public constructor() {
    this.__tracked = false;
  }

  public abstract isAuthenticated(): boolean;
  public get sessionGroupId(): string | null {
    return null;
  }
  public abstract toJSON(): Record<string, any>;

  public toLogContext(): Record<string, any> | null {
    return null;
  }

  protected proxify(): this {
    return new Proxy(this, {
      set: (target, prop: string, val) => {
        target.__markPropertyAsModified(prop);
        target[prop] = val;
        return true;
      },
    });
  }

  protected __markPropertyAsModified(prop: string): void {
    if (this.__tracked && !['__tracked', '__modifiedProperties'].includes(prop)) {
      if (!this.__modifiedProperties) {
        this.__modifiedProperties = new Set();
      }
      this.__modifiedProperties.add(prop);
    }
  }

  /**
   * @return true if entity has any property changes
   */
  public get __modified(): boolean {
    return this.__modifiedProperties && this.__modifiedProperties.size > 0;
  }

  public __track(): void {
    this.__modifiedProperties = undefined;
    this.__tracked = true;
  }


}
