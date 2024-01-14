import type {FrontBackMessage} from './front-back-message.js';

export type CloudBackMessage =
  | FrontBackMessage
  | CloudBackOnlineMessage
  | CloudBackOfflineMessage;

export type CloudBackOnlineMessage = {
  type: 'online';
};

export type CloudBackOfflineMessage = {
  type: 'offline';
};
