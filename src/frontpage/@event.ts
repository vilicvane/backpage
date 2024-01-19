import type {FrontBackEvent, FrontBackEventEffects} from '../shared/index.js';
import {PAGE_EVENT_TARGET_ID_KEY} from '../shared/index.js';

export type InputEventTarget =
  | HTMLInputElement
  | HTMLTextAreaElement
  | HTMLSelectElement;

const EVENT_BUILDER_MAP = new Map<
  string,
  (
    event: Event,
  ) => [options: object | undefined, effects: FrontBackEventEffects | undefined]
>([
  [
    'click',
    event => {
      const {ctrlKey, metaKey, shiftKey, altKey} = event as MouseEvent;

      return [
        {
          ctrlKey,
          metaKey,
          shiftKey,
          altKey,
        },
        undefined,
      ];
    },
  ],
  [
    'input',
    event => [
      undefined,
      {
        target: {
          value: (event.target as InputEventTarget).value,
        },
      },
    ],
  ],
]);

export function buildEvent(event: Event): FrontBackEvent | undefined {
  const target = event.target as HTMLElement | null;

  const targetDataId =
    target?.getAttribute(PAGE_EVENT_TARGET_ID_KEY) ?? undefined;

  if (targetDataId === undefined) {
    return undefined;
  }

  const constructorNames = getPrototypes(event, Event).map(
    prototype => prototype.constructor.name,
  );

  const builder = EVENT_BUILDER_MAP.get(event.type);

  const [options, effects] = builder?.(event) ?? [];

  return {
    constructor: constructorNames,
    type: event.type,
    target: targetDataId,
    options,
    effects,
  };
}

function getPrototypes<T extends object>(
  object: T,
  end: new (...args: never[]) => T,
): T[] {
  const prototypes: T[] = [];

  let prototype = Object.getPrototypeOf(object);

  while (prototype !== end.prototype) {
    prototypes.push(prototype);
    prototype = Object.getPrototypeOf(prototype);
  }

  return prototypes;
}
