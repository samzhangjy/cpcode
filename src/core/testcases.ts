import { showToast } from "../utils/toast";
import { html } from "../utils/helpers";

export type RuntimeTestcase = {
  id: number;
  ele: HTMLElement;
  run: (showToast?: boolean) => Promise<void>;
  toggle: () => void;
  isExpanded: () => boolean;
};

const testcases: RuntimeTestcase[] = [];

const judgeColors = {
  AC: "primary",
  CE: "danger",
  WA: "danger",
  TLE: "warn",
  UKE: "warn",
} as const;

const statusTitles = {
  AC: "Passed",
  CE: "Failed to compile",
  WA: "Wrong answer",
  TLE: "Timed out",
  UKE: "Unknown error",
} as const;

const deleteTestcase = (id: number, callback?: () => void) => {
  const testcasesContainer = document.getElementById("testcases");
  const testcasePosition = testcases.findIndex((val) => val.id === id);
  testcasesContainer.removeChild(testcases[testcasePosition].ele);
  testcases.splice(testcasePosition, 1);
  for (const i in testcases) {
    const testcaseTitle = document
      .getElementById(`testcase-title-${testcases[i].id}`)
      .getElementsByTagName("span")[0];
    testcaseTitle.innerHTML = `Testcase ${parseInt(i) + 1}`;
  }
  if (callback) callback();
};

export const getTestcases = () => {
  return testcases.map((testcase) => {
    const inputTextarea = document.getElementById(
      `testcase-input-${testcase.id}`
    ) as HTMLInputElement;
    const expectedOutputTextarea = document.getElementById(
      `testcase-expected-output-${testcase.id}`
    ) as HTMLInputElement;
    return {
      input: inputTextarea.value,
      expectedOutput: expectedOutputTextarea.value,
      ...testcase,
    };
  });
};

export const getTestcase = (id: number) => {
  const testcase = testcases.find((testcase) => testcase.id === id);
  const inputTextarea = document.getElementById(
    `testcase-input-${testcase.id}`
  ) as HTMLInputElement;
  const expectedOutputTextarea = document.getElementById(
    `testcase-expected-output-${testcase.id}`
  ) as HTMLInputElement;
  return {
    ...testcase,
    input: inputTextarea.value,
    expectedOutput: expectedOutputTextarea.value,
  };
};

export const runTestcase = async (
  id: number,
  programPath: string,
  shouldShowToast = true
) => {
  const testcase = getTestcase(id);
  const judgeResult = await window.electronAPI.judgeProgram({
    programPath,
    expectedOutput: testcase.expectedOutput,
    input: testcase.input,
    timeout: 1000,
  });

  for (const className of testcase.ele.classList) {
    if (className.startsWith("testcase-"))
      testcase.ele.classList.remove(className);
  }

  testcase.ele.classList.add(`testcase-${judgeResult.status.toLowerCase()}`);

  if (shouldShowToast) {
    showToast(document.body, {
      title: `${statusTitles[judgeResult.status]}${
        judgeResult.elapsed ? ` / ${judgeResult.elapsed}ms` : ""
      }`,
      desc: judgeResult.msg,
      icon: judgeResult.status === "AC" ? "ci-check" : "ci-close_big",
      color: judgeColors[judgeResult.status],
      timeout: judgeResult.status === "AC" ? 5000 : -1,
    });
  }
};

const _addTestcase = async (
  e: MouseEvent,
  sourcePath: string,
  callback?: () => string | Promise<string>
) => {
  if (!sourcePath) {
    return _addTestcase(e, await callback(), callback);
  }
  const testcasesContainer = document.getElementById("testcases");
  const testcase = document.createElement("div");
  const curId = e.timeStamp;
  const testcaseNo = testcases.length + 1;
  testcase.innerHTML = html`
    <h2 class="testcase-title" id="testcase-title-${curId}">
      <i
        class="icon testcase-icon ci-chevron_down"
        id="testcase-title-icon-${curId}"
      ></i
      ><span>Testcase ${testcaseNo}</span>
      <div class="testcase-operations">
        <button
          class="button button-primary button-icon"
          id="testcase-run-${curId}"
        >
          <i class="icon ci-refresh"></i>
        </button>
        <button
          class="button button-secondary button-icon"
          id="testcase-diff-${curId}"
        >
          <i class="icon ci-code"></i>
        </button>
        <button
          class="button button-danger button-icon"
          id="testcase-delete-${curId}"
        >
          <i class="icon ci-trash_full"></i>
        </button>
      </div>
    </h2>
    <div class="testcase-detail-show" id="testcase-detail-${curId}">
      <h3 class="testcase-input-label">Input</h3>
      <textarea class="testcase-input" id="testcase-input-${curId}"></textarea>
      <h3 class="testcase-input-label">Expected output</h3>
      <textarea
        class="testcase-input"
        id="testcase-expected-output-${curId}"
      ></textarea>
    </div>
  `;

  testcase.classList.add("testcase");
  testcasesContainer.appendChild(testcase);
  const testcaseTitle = document.getElementById(`testcase-title-${curId}`);
  const testcaseDetail = document.getElementById(`testcase-detail-${curId}`);
  const testcaseTitleIcon = document.getElementById(
    `testcase-title-icon-${curId}`
  );
  const testcaseDelete = document.getElementById(`testcase-delete-${curId}`);
  const testcaseRun = document.getElementById(`testcase-run-${curId}`);
  const testcaseDiff = document.getElementById(`testcase-diff-${curId}`);
  const testcaseInput = document.getElementById(
    `testcase-input-${curId}`
  ) as HTMLInputElement;
  const testcaseExpectedOutput = document.getElementById(
    `testcase-expected-output-${curId}`
  ) as HTMLInputElement;
  testcaseDelete.addEventListener("click", (e) => {
    e.stopPropagation();
    deleteTestcase(curId, callback);
  });
  testcaseRun.addEventListener("click", (e) => {
    e.stopPropagation();
    runTestcase(curId, sourcePath);
  });
  const isExpanded = () => {
    return testcaseDetail.classList.contains("testcase-detail-show");
  };
  const toggleTestcase = () => {
    if (isExpanded()) {
      testcaseDetail.classList.remove("testcase-detail-show");
      testcaseDetail.classList.add("testcase-detail-hide");
      testcaseTitleIcon.classList.remove("ci-chevron_down");
      testcaseTitleIcon.classList.add("ci-chevron_right");
    } else {
      testcaseDetail.classList.remove("testcase-detail-hide");
      testcaseDetail.classList.add("testcase-detail-show");
      testcaseTitleIcon.classList.remove("ci-chevron_right");
      testcaseTitleIcon.classList.add("ci-chevron_down");
    }
  };
  testcaseTitle.addEventListener("click", toggleTestcase);
  if (callback) {
    testcaseInput.addEventListener("input", callback);
    testcaseExpectedOutput.addEventListener("input", callback);
    callback();
  }
  return {
    run: async (showToast = true) => {
      await runTestcase(curId, sourcePath, showToast);
    },
    toggle: toggleTestcase,
    isExpanded,
    ele: testcase,
    id: curId,
  };
};

export const addTestcase = async (
  e: MouseEvent,
  sourcePath: string,
  callback?: () => string | Promise<string>
) => {
  const result = await _addTestcase(e, sourcePath, callback);
  testcases.push(result);
  return result;
};
