export const initResizable = (ele: HTMLElement) => {
  let x = 0,
    w = 0;
  const mouseMoveHandler = (e: MouseEvent) => {
    const dx = e.clientX - x;

    ele.style.flexBasis = `${w + dx}px`;
  };

  const mouseUpHandler = () => {
    document.removeEventListener("mousemove", mouseMoveHandler);
    document.removeEventListener("mouseup", mouseUpHandler);
  };

  const mouseDownHandler = (e: MouseEvent) => {
    x = e.clientX;
    const styles = getComputedStyle(ele);
    w = parseInt(styles.flexBasis);

    document.addEventListener("mousemove", mouseMoveHandler);
    document.addEventListener("mouseup", mouseUpHandler);
  };

  return mouseDownHandler;
};

export const initResizables = () => {
  const resizables = document.getElementsByClassName("resizable");
  for (const resizable of resizables) {
    const resizer = resizable.getElementsByClassName("resizer")[0];
    resizer.addEventListener(
      "mousedown",
      initResizable(resizable as HTMLElement)
    );
  }
};
