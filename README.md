# Roo Code CLI

<img width="1359" alt="Screenshot 2025-04-03 at 11 55 17 PM" src="https://github.com/user-attachments/assets/62405703-4ca6-42f4-ab8a-fc0bfa9d3680" />

Install packages:

```sh
pnpm install
```

Start VS Code with a unix socket for IPC (requires the latest version of the Roo Code to be installed):

```sh
ROO_CODE_IPC_SOCKET_PATH=/tmp/roo-code.sock code
```

Connect to Roo Code via the unix socket and start a new task:

```sh
pnpm dev "Tell me a pirate joke."
```
