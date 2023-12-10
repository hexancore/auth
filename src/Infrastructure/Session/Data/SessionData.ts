import { Dto } from "@hexancore/common";
import { AbstractEntity, Entity } from "@hexancore/core";

export abstract class SessionData {

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

  protected proxify(): this {
    return new Proxy(this, {
      set: (target, prop: string, val) => {
        if (target.__tracked && !['__tracked', '__modifiedProperties'].includes(prop)) {
          if (!this.__modifiedProperties) {
            this.__modifiedProperties = new Set();
          }
          target.__modifiedProperties.add(prop);
        }
        target[prop] = val;
        return true;
      },
    });
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
