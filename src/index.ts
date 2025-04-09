import pWaitFor from "p-wait-for";
import ipc from "node-ipc";

import {
  IpcOrigin,
  IpcMessageType,
  TaskCommandName,
  TaskEvent,
} from "./types.js";
import { RooCodeClient } from "./client.js";

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
      commandName: TaskCommandName.StartNewTask,
      data: {
        configuration: {
          apiProvider: "openrouter",
          openRouterApiKey: process.env.OPENROUTER_API_KEY!,
          openRouterModelId: "google/gemini-2.0-flash-001",
          openRouterModelInfo: {
            maxTokens: 8192,
            contextWindow: 1000000,
            supportsImages: true,
            supportsPromptCache: false,
            inputPrice: 0.1,
            outputPrice: 0.4,
            thinking: false,
          },

          pinnedApiConfigs: {},
          lastShownAnnouncementId: "mar-20-2025-3-10",

          autoApprovalEnabled: true,
          alwaysAllowReadOnly: true,
          alwaysAllowReadOnlyOutsideWorkspace: false,
          alwaysAllowWrite: true,
          alwaysAllowWriteOutsideWorkspace: false,
          writeDelayMs: 200,
          alwaysAllowBrowser: true,
          alwaysApproveResubmit: true,
          requestDelaySeconds: 5,
          alwaysAllowMcp: true,
          alwaysAllowModeSwitch: true,
          alwaysAllowSubtasks: true,
          alwaysAllowExecute: true,
          allowedCommands: ["*"],

          browserToolEnabled: false,
          browserViewportSize: "900x600",
          screenshotQuality: 38,
          remoteBrowserEnabled: true,

          enableCheckpoints: false,
          checkpointStorage: "task",

          ttsEnabled: false,
          ttsSpeed: 1,
          soundEnabled: false,
          soundVolume: 0.5,

          maxOpenTabsContext: 20,
          maxWorkspaceFiles: 200,
          showRooIgnoredFiles: true,
          maxReadFileLine: 500,

          terminalOutputLineLimit: 500,
          terminalShellIntegrationTimeout: 15000,

          diffEnabled: true,
          fuzzyMatchThreshold: 1.0,

          experiments: {
            search_and_replace: true,
            insert_content: false,
            powerSteering: false,
          },

          language: "en",

          telemetrySetting: "enabled",

          mcpEnabled: false,
          mode: "code",
          customModes: [],
        },
        text: message,
      },
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
      (eventName === "message" || eventName === "attempt_completion") &&
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
