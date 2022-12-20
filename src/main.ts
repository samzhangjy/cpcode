import Mousetrap from "mousetrap";
import { addTestcase, getTestcases } from "./core/testcases";
import "./styles/style.css";
import { html } from "./utils/helpers";
import { initMonacoEditor } from "./utils/monacoSetup";
import { initResizables } from "./utils/resizables";

const appContainer = document.querySelector<HTMLDivElement>("#app")!;

appContainer.innerHTML = html`
    <div class="title-bar" id="title-bar">CPCode</div>
  <div class="container">
    <div id="side-panel" class="side-panel resizable">
      <div class="resizer resizer-x"></div>
      <h2 class="side-panel-title">Competitive Helper</h2>
      <div class="testcases" id="testcases"></div>
      <div class="side-panel-footer">
        <button class="button button-primary" id="new-testcase">
          <i class="icon ci-plus" style="margin-right: 5px"></i>
          New testcase
        </button>
        <button class="button button-secondary" id="run-all-testcase">
          <i class="icon ci-refresh" style="margin-right: 5px"></i>
          Run all
        </button>
      </div>
    </div>
    <div id="editor" class="editor"></div>
  </div>
`;

const renderTitlebar = async () => {
  if (await window.electronAPI.getPlatform() === "darwin") return;
  document.getElementById("title-bar").remove();
}

renderTitlebar();

const editor = initMonacoEditor();
let currentLocation: string = undefined;
initResizables();

const handleSave = async () => {
  const preferences = await window.electronAPI.getPreferences();
  let location = currentLocation;

  if (!currentLocation) location = await window.electronAPI.openSaveDialog();
  if (!location) return;
  if (!location.endsWith(".cpp")) {
    location += ".cpp";
  }

  await window.electronAPI.saveToFile(location, editor.getValue());
  await window.electronAPI.setPreferences({
    ...preferences,
    solutions: {
      ...preferences.solutions,
      [location]: {
        testcases: getTestcases(),
      },
    },
  });

  currentLocation = location;
  return currentLocation;
};

const watchForEditorChanges = (callback: () => void, timeout = 1000) => {
  let timeoutId = null;
  editor.onDidChangeModelContent(() => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(callback, timeout);
  });
};

watchForEditorChanges(handleSave);

Mousetrap.bind(["command+s", "ctrl+s"], handleSave);

window.addEventListener("saveFile", handleSave);

const newTestcaseBtn = document.getElementById("new-testcase");
const runAllTestcasesBtn = document.getElementById("run-all-testcase");
newTestcaseBtn.addEventListener("click", async (e) => {
  await addTestcase(e, currentLocation, handleSave);
});
runAllTestcasesBtn.addEventListener("click", async (e) => {
  const testcases = getTestcases();
  for (const testcase of testcases) {
    await testcase.run(false);
    if (testcase.isExpanded()) {
      testcase.toggle();
    }
  }
});
