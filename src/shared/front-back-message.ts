export type FrontBackMessage = FrontBackNotifiedMessage;

export type FrontBackNotifiedMessage = {
  type: 'notified';
  id: string;
};
