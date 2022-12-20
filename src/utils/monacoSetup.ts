import * as monaco from "monaco-editor";

export const initMonacoEditor = () => {
  self.MonacoEnvironment = {
    getWorker: function (_workerId, label) {
      const getWorkerModule = (moduleUrl: string, label: string) => {
        return new Worker(
          self.MonacoEnvironment.getWorkerUrl(moduleUrl, null),
          {
            name: label,
            type: "module",
          }
        );
      };

      switch (label) {
        case "json":
          return getWorkerModule(
            "/monaco-editor/esm/vs/language/json/json.worker?worker",
            label
          );
        case "css":
        case "scss":
        case "less":
          return getWorkerModule(
            "/monaco-editor/esm/vs/language/css/css.worker?worker",
            label
          );
        case "html":
        case "handlebars":
        case "razor":
          return getWorkerModule(
            "/monaco-editor/esm/vs/language/html/html.worker?worker",
            label
          );
        case "typescript":
        case "javascript":
          return getWorkerModule(
            "/monaco-editor/esm/vs/language/typescript/ts.worker?worker",
            label
          );
        default:
          return getWorkerModule(
            "/monaco-editor/esm/vs/editor/editor.worker?worker",
            label
          );
      }
    },
  };

  const editor = monaco.editor.create(document.getElementById("editor"), {
    value: "",
    language: "cpp",
    automaticLayout: true,
  });

  editor.addAction({
    id: "saveFile",
    label: "Save file",
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
    precondition: null,
    contextMenuGroupId: "file",
    contextMenuOrder: 1.5,
    run: () => {
      window.dispatchEvent(new CustomEvent("saveFile"));
    },
  });

  return editor;
};
