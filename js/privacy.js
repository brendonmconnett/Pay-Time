// Lets the user mask every dollar figure on screen (live earnings, rates, history) at a glance.
var Privacy = (function () {
  var MASK = "••••";

  function isHidden() {
    return !!Storage.getSettings().hideAmounts;
  }

  function apply() {
    document.documentElement.setAttribute("data-hide-amounts", isHidden() ? "true" : "false");
  }

  function setHidden(hidden) {
    var settings = Storage.getSettings();
    settings.hideAmounts = hidden;
    Storage.setSettings(settings);
    apply();
  }

  function mask(text) {
    return isHidden() ? MASK : text;
  }

  function init() {
    apply();
  }

  return { init: init, isHidden: isHidden, setHidden: setHidden, mask: mask };
})();
