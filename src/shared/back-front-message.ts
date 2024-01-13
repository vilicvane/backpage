import type {DiffMatchPatches} from './diff-match-patch.js';

export type BackFrontMessage = BackFrontUpdateMessage | BackFrontNotifyMessage;

export type BackFrontUpdateMessage = {
  type: 'update';
  title: string;
  content: string | DiffMatchPatches;
};

export type BackFrontNotifyMessage = {
  type: 'notify';
  title: string;
  body?: string;
};
