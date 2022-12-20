import type {
  CompileResult,
  JudgeOptions,
  JudgeResult,
  RunCommandResult,
} from "./electron/main";

export interface IElectronAPI {
  openSaveDialog: () => Promise<string | null>;
  getPlatform: () => Promise<NodeJS.Platform>;
  saveToFile: (path: string, content: string) => Promise<void>;
  getPreferences: () => Promise<any>;
  setPreferences: (preferences: any) => Promise<void>;
  runCommand: (
    _event: IpcMainInvokeEvent,
    command: string
  ) => Promise<RunCommandResult>;
  compile: (targetPath: string) => Promise<CompileResult>;
  judgeProgram: (options: JudgeOptions) => Promise<JudgeResult>;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
