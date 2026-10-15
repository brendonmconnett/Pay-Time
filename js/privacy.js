// Masks every dollar figure on screen (live earnings, rates, history) behind a passcode.
// Deliberately in-memory only, never persisted: every fresh load (refresh, reopening the
// PWA, coming back after the OS killed the tab) must start hidden again by design.
var Privacy = (function () {
  var MASK = "••••";
  var hidden = true;

  function isHidden() {
    return hidden;
  }

  function apply() {
    document.documentElement.setAttribute("data-hide-amounts", hidden ? "true" : "false");
  }

  function setHidden(value) {
    hidden = !!value;
    apply();
  }

  function mask(text) {
    return hidden ? MASK : text;
  }

  function init() {
    hidden = true;
    apply();
  }

  return { init: init, isHidden: isHidden, setHidden: setHidden, mask: mask };
})();
