import { html } from "./helpers";
import "../styles/toast.css";

export type ToastOptions = {
  icon?: string;
  title?: string;
  desc?: string;
  color?: "primary" | "danger" | "warn";
  timeout?: number;
};

export const showToast = (container: HTMLElement, options: ToastOptions) => {
  const toast = document.createElement("div");
  toast.classList.add("toast", `toast-${options.color}`);
  toast.innerHTML = html`
    <div class="toast-content">
      <i class="icon ${options.icon} check"></i>

      <div class="message">
        <span class="text text-1">${options.title}</span>
        <span class="text text-2">${options.desc}</span>
      </div>
    </div>
    <i class="ci-close_big close"></i>
    <div class="progress"></div>
  `;

  const closeIcon = toast.querySelector(".close");
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("active");
  }, 10);

  let timer1: NodeJS.Timeout | undefined;
  let timer2: NodeJS.Timeout | undefined;

  if (!options.timeout || options.timeout > 0) {
    timer1 = setTimeout(() => {
      toast.classList.remove("active");
    }, options.timeout || 5000);
  }
  const checkExisting = () => {
    if (container.getElementsByClassName("toast").length > 1) {
      toast.classList.remove("active");

      setTimeout(() => {
        container.removeChild(toast);
      }, 300);
      return;
    }
    timer2 = setTimeout(checkExisting, 100);
  };
  timer2 = setTimeout(checkExisting, 1000);

  closeIcon.addEventListener("click", () => {
    toast.classList.remove("active");
    setTimeout(() => {
      container.removeChild(toast);
    }, 300);
    if (!options.timeout || options.timeout > 0) {
      clearTimeout(timer1);
    }
    clearTimeout(timer2);
  });
};
