import type {PageUpdateContent} from './page.js';

export type BackFrontMessage = BackFrontUpdateMessage | BackFrontNotifyMessage;

export type BackFrontUpdateMessage = {
  type: 'update';
  content: PageUpdateContent;
};

export type BackFrontNotifyMessage = {
  type: 'notify';
  id: string;
  title: string;
  body?: string;
};
