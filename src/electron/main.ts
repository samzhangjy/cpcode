process.env.DIST = path.join(__dirname, "..");
process.env.PUBLIC = app.isPackaged
  ? process.env.DIST
  : path.join(process.env.DIST, "../public");

import path from "path";
import fs from "fs-extra";
import os from "os";
import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  IpcMainInvokeEvent,
} from "electron";
import { exec, PromiseWithChild } from "child_process";
import util from "util";
import { diffArrays } from "diff";

let win: BrowserWindow | null;
const preload = path.join(__dirname, "./preload.js");
const serverURL = process.env["VITE_DEV_SERVER_URL"];
const preferencesPath = path.join(os.homedir(), ".cpcode/settings.json");

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.PUBLIC, "logo.svg"),
    webPreferences: {
      contextIsolation: true,
      preload,
    },
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "hidden",
    title: "CPCode",
  });

  win.on("page-title-updated", function (e) {
    e.preventDefault();
  });

  if (app.isPackaged) {
    win.loadFile(path.join(process.env.DIST, "index.html"));
  } else {
    win.loadURL(serverURL);
  }
}

app.on("window-all-closed", () => {
  win = null;
  app.quit();
});

const handleOpenSaveDialog = async () => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: undefined,
  });
  if (canceled) return null;
  return filePath;
};

const handleSaveToFile = async (
  _event: IpcMainInvokeEvent,
  path: string,
  content: string
) => {
  return await fs.writeFile(path, content);
};

const handleGetPreferences = async () => {
  if (!fs.existsSync(preferencesPath)) return {};
  const contents = JSON.parse(fs.readFileSync(preferencesPath).toString());
  return contents;
};

const handleSetPreferences = async (
  _event: IpcMainInvokeEvent,
  preferences: any
) => {
  if (!fs.existsSync(preferencesPath)) {
    fs.createFileSync(preferencesPath);
  }
  return fs.writeFileSync(preferencesPath, JSON.stringify(preferences));
};

export type RunCommandResult =
  | { status: "success"; stdout?: string; stderr?: string; msg: string }
  | {
      status: "promise-success";
      promise: PromiseWithChild<{
        stdout: string;
        stderr: string;
      }>;
      msg: string;
    }
  | {
      status: "error";
      msg: string | Error;
    };

const handleRunCommand = async (
  _event: IpcMainInvokeEvent,
  command: string,
  promiseOnly = false,
  stdin?: string
): Promise<RunCommandResult> => {
  const execPromise = util.promisify(exec);
  try {
    const promise = execPromise(command);
    const child = promise.child;
    let exitCode = 0;
    if (stdin) {
      child.stdin.write(stdin);
    }
    if (promiseOnly) {
      return {
        status: "promise-success",
        promise: promise,
        msg: "success",
      };
    }
    child.on("close", (code) => (exitCode = code));
    const { stdout, stderr } = await promise;
    return { status: "success", stdout, stderr, msg: "success" };
  } catch (e) {
    return { status: "error", msg: e as Error | string };
  }
};

export type CompileResult = {
  executablePath: string;
  msg: string;
} & RunCommandResult;

export const handleCompile = async (
  _event: IpcMainInvokeEvent,
  targetPath: string
): Promise<CompileResult> => {
  const preferences = await handleGetPreferences();
  let compiler = "g++";
  if (preferences.compiler) compiler = preferences.compiler;
  const parsedPath = path.parse(targetPath);
  const outputPath = path.join(parsedPath.dir, `${parsedPath.name}.bin`);
  const command = `${compiler} "${targetPath}" -o "${outputPath}"`;
  const commandResult = await handleRunCommand(null, command);
  if (commandResult.status === "success") {
    return { ...commandResult, executablePath: outputPath };
  }
  const msg = commandResult.msg.toString();
  const commandIdx = msg.indexOf(command);
  commandResult.msg = msg.slice(commandIdx + command.length + 1);
  return { ...commandResult, executablePath: outputPath } as CompileResult;
};

export type JudgeResult = {
  status: "AC" | "CE" | "WA" | "TLE" | "UKE";
  elapsed?: number;
  msg: string;
  output?: string;
};

export type JudgeOptions = {
  programPath: string;
  expectedOutput: string;
  input: string;
  timeout: number;
};

export const handleJudgeProgram = async (
  _event: IpcMainInvokeEvent,
  options: JudgeOptions
): Promise<JudgeResult> => {
  const compileResult = await handleCompile(null, options.programPath);
  if (compileResult.status !== "success") {
    return {
      status: "CE",
      msg: compileResult.msg,
    };
  }
  const programProcess = await handleRunCommand(
    null,
    compileResult.executablePath,
    true,
    options.input
  );

  if (programProcess.status !== "promise-success") {
    return { status: "UKE", msg: "Failed to start target program executable." };
  }

  let isKilled = false;
  const timer = setTimeout(() => {
    if (programProcess.promise.child.killed) return;
    isKilled = true;
    programProcess.promise.child.kill();
  }, options.timeout);

  const startTime = Date.now();
  let elapsed = -1;

  programProcess.promise.child.on("exit", () => {
    clearTimeout(timer);
    elapsed = Date.now() - startTime;
  });

  let commandResult: {
    stdout: string;
    stderr: string;
  } = null;

  try {
    commandResult = await programProcess.promise;
  } catch {
    if (isKilled) {
      return {
        status: "TLE",
        elapsed,
        msg: `Time limit exceeded. Program ran longer than the expected ${options.timeout}ms.`,
      };
    }
    return {
      status: "UKE",
      msg: "An unknown error occured while executing program.",
    };
  }

  const normalizeOutput = (output: string) => {
    return output
      .split("\n")
      .filter((line, idx, lines) => {
        if (idx === lines.length - 1 && !line.trimEnd()) return false;
        return true;
      })
      .map((line) => {
        return line.trimEnd();
      });
  };

  const lines = normalizeOutput(commandResult.stdout);
  const expectedLines = normalizeOutput(options.expectedOutput);

  if (lines.length != expectedLines.length) {
    return {
      status: "WA",
      elapsed,
      output: commandResult.stdout,
      msg: `Answer too short on line ${Math.min(
        lines.length - 1,
        expectedLines.length - 1
      )}`,
    };
  }

  for (let i = 0; i < lines.length; i++) {
    if (lines[i] !== expectedLines[i]) {
      return {
        status: "WA",
        output: commandResult.stdout,
        elapsed,
        msg: `Wrong answer on line ${i}.`,
      };
    }
  }

  return {
    status: "AC",
    elapsed,
    output: commandResult.stdout,
    msg: "Accepted.",
  };
};

app.whenReady().then(() => {
  ipcMain.handle("dialog:saveFile", handleOpenSaveDialog);
  ipcMain.handle("pref:platform", () => process.platform);
  ipcMain.handle("file:save", handleSaveToFile);
  ipcMain.handle("pref:getAll", handleGetPreferences);
  ipcMain.handle("pref:setAll", handleSetPreferences);
  ipcMain.handle("judge:runCommand", handleRunCommand);
  ipcMain.handle("judge:compile", handleCompile);
  ipcMain.handle("judge:judgeProgram", handleJudgeProgram);
  createWindow();
});
