(function () {
  const RTL_REGEX =
    /[\u0591-\u05F4\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;

  const INPUT_SELECTOR =
    "input:not([type=checkbox]):not([type=radio]):not([type=hidden]), textarea";

  /**
   * @param {string} text
   * @returns {"RTL" | "LTR"}
   */
  function detectTextDirection(text) {
    if (!text || text.trim().length === 0) {
      return "LTR";
    }
    return RTL_REGEX.test(text) ? "RTL" : "LTR";
  }

  /**
   * @param {HTMLInputElement | HTMLTextAreaElement | null | undefined} element
   */
  function applyTextDirection(element) {
    if (!element) return;
    element.setAttribute("dir", detectTextDirection(element.value).toLowerCase());
  }

  /**
   * @param {HTMLInputElement | HTMLTextAreaElement | null | undefined} element
   */
  function bindTextDirection(element) {
    if (!element || element.dataset.textDirectionBound === "true") return;
    element.dataset.textDirectionBound = "true";
    applyTextDirection(element);
    element.addEventListener("input", () => applyTextDirection(element));
  }

  /**
   * @param {ParentNode | Document | null | undefined} [scope]
   */
  function bindTextDirectionAll(scope) {
    const root = scope || document;
    root.querySelectorAll(INPUT_SELECTOR).forEach((element) => bindTextDirection(element));
  }

  window.AccredTextDirection = {
    detectTextDirection,
    applyTextDirection,
    bindTextDirection,
    bindTextDirectionAll
  };
})();
