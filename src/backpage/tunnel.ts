import type {BackFrontMessage} from '../shared/index.js';

export abstract class Tunnel {
  private clientStateMap = new Map<TunnelClient, ClientState>();

  private html = '<div>BackPage</div>';

  update(html: string): void {
    this.html = html;

    for (const [client, clientState] of this.clientStateMap) {
      this.sendUpdateToClient(client, clientState);
    }
  }

  abstract getURL(): Promise<string>;

  abstract close(): void;

  protected addClient(client: TunnelClient): void {
    const clientState: ClientState = {idle: true};

    this.clientStateMap.set(client, clientState);

    this.sendUpdateToClient(client, clientState);
  }

  protected removeClient(client: TunnelClient): void {
    this.clientStateMap.delete(client);
  }

  private sendUpdateToClient(
    client: TunnelClient,
    clientState: ClientState,
  ): void {
    if (!clientState.idle) {
      return;
    }

    clientState.idle = false;

    const {html} = this;

    void client.send({type: 'update', html}).then(() => {
      clientState.idle = true;

      if (html !== this.html) {
        this.sendUpdateToClient(client, clientState);
      }
    });
  }
}

type ClientState = {
  idle: boolean;
};

export abstract class TunnelClient {
  abstract send(message: BackFrontMessage): Promise<void>;
}
