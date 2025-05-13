import pWaitFor from "p-wait-for";
import ipc from "node-ipc";

import {
  RooCodeSettings,
  IpcOrigin,
  IpcMessageType,
  TaskEvent,
} from "@roo-code/types";

import { RooCodeClient } from "./client.js";

const configuration: RooCodeSettings = {
  apiProvider: "openrouter",
  openRouterApiKey: process.env.OPENROUTER_API_KEY!,
  openRouterModelId: "google/gemini-2.0-flash-001",

  autoApprovalEnabled: true,
  alwaysAllowReadOnly: true,
  alwaysAllowWrite: true,
  alwaysAllowBrowser: true,
  alwaysApproveResubmit: true,
  alwaysAllowMcp: true,
  alwaysAllowModeSwitch: true,
  alwaysAllowSubtasks: true,
  alwaysAllowExecute: true,
  allowedCommands: ["*"],

  browserToolEnabled: false,
  enableCheckpoints: false,

  mode: "code",
};

const startTask = async (message = "Tell me a joke about pirates.") => {
  const client = new RooCodeClient("/tmp/roo-code.sock");
  let clientId: string | undefined = undefined;

  client.on(IpcMessageType.Ack, (data) => {
    console.log(`[CONNECTED] clientId=${data.clientId}\n`);
    clientId = data.clientId;
  });

  client.connect();

  await pWaitFor(() => typeof clientId === "string", {
    interval: 250,
    timeout: 10_000,
  });

  if (!clientId) {
    throw new Error(`Failed to connect to server: ${clientId}`);
  }

  client.sendMessage({
    type: IpcMessageType.TaskCommand,
    origin: IpcOrigin.Client,
    clientId,
    data: {
      commandName: "StartNewTask",
      data: { configuration, text: message },
    },
  });

  let isDone = false;

  process.on("SIGINT", () => {
    if (client.isConnected || ipc.of[client["_id"]]) {
      client.disconnect();
    }

    isDone = true;
  });

  let taskId: string | undefined = undefined;

  client.on(IpcMessageType.TaskEvent, ({ eventName, payload }: TaskEvent) => {
    if (
      eventName === "message" &&
      payload[0].taskId === taskId &&
      payload[0].message.partial === false
    ) {
      console.log(payload[0].message.text + "\n");
      isDone = true;
    }

    if (eventName === "taskStarted") {
      taskId = payload[0];
    }

    if (eventName === "taskCompleted" || eventName === "taskAborted") {
      isDone = payload[0] === taskId;
    }
  });

  await pWaitFor(() => isDone);
  process.exit(0);
};

const message = process.argv[2];

if (!message) {
  console.error("Usage: pnpm dev <task>");
  process.exit(1);
}

startTask(message);
