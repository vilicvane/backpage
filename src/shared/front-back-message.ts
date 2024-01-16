export type FrontBackMessage =
  | FrontBackNotifiedMessage
  | FrontBackActionMessage;

export type FrontBackNotifiedMessage = {
  type: 'notified';
  id: string;
};

export type FrontBackActionMessage = {
  type: 'action';
  name: string;
  data: object;
};
