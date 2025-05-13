import EventEmitter from "node:events";
import * as crypto from "node:crypto";

import ipc from "node-ipc";

import {
  IpcOrigin,
  IpcMessage,
  IpcMessageType,
  TaskEvent,
} from "@roo-code/types";

// TODO: Add to `@roo-code/types`.
type Ack = {
  clientId: string;
  pid: number;
  ppid: number;
};

type IpcClientEvents = {
  [IpcMessageType.Connect]: [];
  [IpcMessageType.Disconnect]: [];
  [IpcMessageType.Ack]: [data: Ack];
  [IpcMessageType.TaskEvent]: [data: TaskEvent];
};

export class RooCodeClient extends EventEmitter<IpcClientEvents> {
  private readonly _socketPath: string;
  private readonly _id: string;
  private readonly _log: (...args: unknown[]) => void;
  private _isConnected = false;
  private _clientId?: string;

  constructor(socketPath: string, log = console.log) {
    super();

    this._socketPath = socketPath;
    this._id = `standalone-client-${crypto.randomBytes(6).toString("hex")}`;
    this._log = log;
  }

  public connect() {
    if (this._isConnected) {
      return;
    }

    ipc.config.silent = true;

    ipc.connectTo(this._id, this._socketPath, () => {
      const clientSocket = ipc.of[this._id];

      if (!clientSocket) {
        throw new Error(`Failed to get socket handle: ${this._id}`);
      }

      clientSocket.on("connect", () => this.onConnect());
      clientSocket.on("disconnect", () => this.onDisconnect());
      clientSocket.on("message", (data: unknown) => this.onMessage(data));
      clientSocket.on("error", (err: Error) => this.onError(err));
    });
  }

  private onConnect() {
    if (this._isConnected) {
      return;
    }

    this._isConnected = true;
    this.emit(IpcMessageType.Connect);
  }

  private onDisconnect() {
    if (!this._isConnected) {
      return;
    }

    this._isConnected = false;
    this._clientId = undefined;
    this.emit(IpcMessageType.Disconnect);
  }

  private onError(err: Error) {
    this._log(err);
    this._log(
      "Did you start VS Code with `ROO_CODE_IPC_SOCKET_PATH=/tmp/roo-code.sock code <workspace_path>?`"
    );
    this.disconnect();
  }

  private onMessage(data: unknown) {
    if (typeof data !== "object" || data === null) {
      return;
    }

    const payload = data as IpcMessage;

    if (payload.origin === IpcOrigin.Server) {
      switch (payload.type) {
        case IpcMessageType.Ack:
          this._clientId = payload.data.clientId;
          this.emit(IpcMessageType.Ack, payload.data);
          break;
        case IpcMessageType.TaskEvent:
          this.emit(IpcMessageType.TaskEvent, payload.data);
          break;
      }
    }
  }

  public sendMessage(message: IpcMessage) {
    if (!this.isConnected || !ipc.of[this._id]) {
      return;
    }

    ipc.of[this._id]?.emit("message", message);
  }

  public disconnect() {
    if (!this._isConnected && !ipc.of[this._id]) {
      return;
    }

    try {
      ipc.disconnect(this._id);
      this.onDisconnect();
    } catch (error) {}
  }

  public get socketPath() {
    return this._socketPath;
  }

  public get clientId() {
    return this._clientId;
  }

  public get isConnected() {
    return this._isConnected;
  }

  public get isReady() {
    return this._isConnected && this._clientId !== undefined;
  }
}
