import morphdom from 'morphdom';
import {toDOM} from 'plain-dom';

import type {
  BackFrontNotifyMessage,
  BackFrontUpdateMessage,
  PageSettings,
  PageSnapshot,
} from '../shared/index.js';
import {
  PAGE_EVENT_TARGET_ID_KEY,
  patchPageSnapshotInPlace,
} from '../shared/index.js';

import type {Back} from './@back.js';

export class Content {
  private originalTitle = document.title;

  private initialContent: Element;

  private snapshot: PageSnapshot | undefined;

  private pendingNotifications = 0;

  constructor(readonly back: Back) {
    this.initialContent = document.body.cloneNode(true) as Element;

    document.addEventListener('visibilitychange', () => {
      if (this.snapshot) {
        this.updateTitle(this.snapshot.title);
      }
    });

    back.onMessage(message => {
      switch (message.type) {
        case 'update':
          this.handleUpdateMessage(message);
          break;
        case 'notify':
          void this.handleNotifyMessage(message);
          break;
      }
    });
  }

  private handleUpdateMessage({content}: BackFrontUpdateMessage): void {
    if (content) {
      switch (content.type) {
        case 'snapshot':
          this.snapshot = content.snapshot;
          break;
        case 'delta':
          if (!this.snapshot) {
            throw new Error('Should not receive delta without snapshot.');
          }

          patchPageSnapshotInPlace(this.snapshot, content.delta);

          break;
      }
    } else {
      this.snapshot = undefined;
    }

    if (this.snapshot) {
      this.updateSettings(this.snapshot.settings);

      this.updateTitle(this.snapshot.title);

      morphdom(document.body, toDOM(this.snapshot.body), {
        getNodeKey(node) {
          if (node instanceof HTMLElement) {
            return node.id ?? node.dataset.key ?? undefined;
          } else {
            return undefined;
          }
        },
        // https://github.com/patrick-steele-idem/morphdom?tab=readme-ov-file#can-i-make-morphdom-blaze-through-the-dom-tree-even-faster-yes
        onBeforeElUpdated(from, to) {
          if (
            (from instanceof HTMLInputElement &&
              to instanceof HTMLInputElement) ||
            (from instanceof HTMLTextAreaElement &&
              to instanceof HTMLTextAreaElement) ||
            (from instanceof HTMLSelectElement &&
              to instanceof HTMLSelectElement)
          ) {
            to.value = from.value;
          }

          return !from.isEqualNode(to);
        },
        childrenOnly: true,
      });
    } else {
      this.snapshot = undefined;
      document.body.replaceWith(this.initialContent.cloneNode(true));
    }
  }

  private async handleNotifyMessage({
    notification: {id, title, body},
  }: BackFrontNotifyMessage): Promise<void> {
    const {back} = this;

    this.pendingNotifications++;

    this.updateTitle();

    switch (Notification.permission) {
      case 'granted':
        break;
      case 'denied':
        return;
      case 'default':
        if ((await Notification.requestPermission()) !== 'granted') {
          return;
        } else {
          break;
        }
    }

    const notification = new Notification(title, {body});

    notification.addEventListener('click', () => {
      window.focus();
      notified();
    });
    notification.addEventListener('close', notified);

    function notified(): void {
      back.send({type: 'notified', notification: id});
    }
  }

  private addedEventTypeSet = new Set<string>();

  private updateSettings({events}: PageSettings): void {
    const {addedEventTypeSet, onEvent} = this;

    const eventTypeSet = new Set(events);

    for (const type of addedEventTypeSet) {
      if (!eventTypeSet.has(type)) {
        document.removeEventListener(type, onEvent);
      }
    }

    for (const type of events) {
      addedEventTypeSet.add(type);
      document.addEventListener(type, this.onEvent);
    }
  }

  private updateTitle(newTitle?: string): void {
    if (newTitle !== undefined) {
      this.originalTitle = newTitle;
    }

    if (document.visibilityState === 'visible') {
      this.pendingNotifications = 0;
    }

    const title =
      this.pendingNotifications > 0
        ? `(${this.pendingNotifications}) ${this.originalTitle}`
        : this.originalTitle;

    if (document.title !== title) {
      document.title = title;
    }
  }

  private onEvent = (event: Event): void => {
    const target = event.target as HTMLElement | null;

    const targetDataId =
      target?.getAttribute(PAGE_EVENT_TARGET_ID_KEY) ?? undefined;

    if (targetDataId === undefined) {
      return;
    }

    const constructorNames = getPrototypes(event, Event).map(
      prototype => prototype.constructor.name,
    );

    this.back.send({
      type: 'event',
      event: {
        constructor: constructorNames,
        type: event.type,
        target: targetDataId,
      },
    });
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
