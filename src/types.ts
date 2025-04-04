export enum IpcOrigin {
  Client = "client",
  Server = "server",
}

export enum IpcMessageType {
  Connect = "Connect",
  Disconnect = "Disconnect",
  Ack = "Ack",
  TaskCommand = "TaskCommand",
  TaskEvent = "TaskEvent",
}

export enum TaskCommandName {
  StartNewTask = "StartNewTask",
  CancelTask = "CancelTask",
  CloseTask = "CloseTask",
}

export type TaskCommand = {
  commandName: TaskCommandName.StartNewTask;
  data: {
    configuration: Record<string, any>;
    text?: string;
    images?: string[];
    newTab?: boolean;
  };
};

export type TaskEvent = {
  eventName: string;
  payload: any[];
};

export type Ack = {
  clientId: string;
  pid: number;
  ppid: number;
};

export type IpcMessageBase = {
  origin: IpcOrigin;
  clientId?: string;
};

export type IpcMessageAck = IpcMessageBase & {
  type: IpcMessageType.Ack;
  origin: IpcOrigin.Server;
  data: Ack;
};

export type IpcMessageTaskCommand = IpcMessageBase & {
  type: IpcMessageType.TaskCommand;
  origin: IpcOrigin.Client;
  clientId: string;
  data: TaskCommand;
};

export type IpcMessageTaskEvent = IpcMessageBase & {
  type: IpcMessageType.TaskEvent;
  origin: IpcOrigin.Server;
  data: TaskEvent;
};

export type IpcMessage =
  | IpcMessageAck
  | IpcMessageTaskCommand
  | IpcMessageTaskEvent;

export type IpcClientEvents = {
  [IpcMessageType.Connect]: [];
  [IpcMessageType.Disconnect]: [];
  [IpcMessageType.Ack]: [data: Ack];
  [IpcMessageType.TaskEvent]: [data: TaskEvent];
};
