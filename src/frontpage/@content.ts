import morphdom from 'morphdom';
import {toDOM} from 'plain-dom';

import type {
  BackFrontNotifyMessage,
  BackFrontUpdateMessage,
  PageSnapshot,
} from '../shared/index.js';
import {patchPageSnapshotInPlace} from '../shared/index.js';

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
          this.update(message);
          break;
        case 'notify':
          void this.notify(message);
          break;
      }
    });
  }

  private update({content}: BackFrontUpdateMessage): void {
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

  private async notify({
    id,
    title,
    body,
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
      back.send({type: 'notified', id});
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
}
