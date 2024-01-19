export type FrontBackMessage =
  | FrontBackNotifiedMessage
  | FrontBackActionMessage
  | FrontBackEventMessage;

export type FrontBackNotifiedMessage = {
  type: 'notified';
  notification: string;
};

export type FrontBackActionMessage = {
  type: 'action';
  action: {
    name: string;
    data: object;
  };
};

export type FrontBackEventEffects = {
  target?: object;
};

export type FrontBackEvent = {
  constructor: string[];
  type: string;
  target: string;
  options?: object;
  effects?: FrontBackEventEffects;
};

export type FrontBackEventMessage = {
  type: 'event';
  event: FrontBackEvent;
};
