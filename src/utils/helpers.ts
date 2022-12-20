/**
 * Helper function for defining CSS stylesheets.
 * @param styles Stylesheet string.
 * @returns Stylesheet string.
 */
export const css = (styles: TemplateStringsArray, ...keys: any[]) => {
  let constructedStyle = "";
  let curKeyIndex = 0;
  styles.forEach((style) => {
    constructedStyle += style + keys[curKeyIndex++];
  });
  return constructedStyle;
};

/**
 * Helper function for defining HTML templates.
 * @param templates Template string.
 * @returns Template string.
 */
export const html = (templates: TemplateStringsArray, ...keys: any[]) => {
  let result = "";
  let curKeyIndex = 0;
  templates.forEach((template) => {
    result += template + (keys[curKeyIndex++] ?? "");
  });
  return result;
};
