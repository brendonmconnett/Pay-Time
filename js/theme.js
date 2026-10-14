// Theme resolution: "system" follows prefers-color-scheme live; "light"/"dark" are explicit overrides.
var Theme = (function () {
  var mql = window.matchMedia("(prefers-color-scheme: dark)");

  function resolve(pref) {
    if (pref === "light" || pref === "dark") return pref;
    return mql.matches ? "dark" : "light";
  }

  function apply(pref) {
    document.documentElement.setAttribute("data-theme", resolve(pref));
  }

  function getPreference() {
    return Storage.getSettings().theme;
  }

  function setPreference(pref) {
    var settings = Storage.getSettings();
    settings.theme = pref;
    Storage.setSettings(settings);
    apply(pref);
  }

  function init() {
    apply(getPreference());
    mql.addEventListener("change", function () {
      if (getPreference() === "system") apply("system");
    });
  }

  return { init: init, apply: apply, getPreference: getPreference, setPreference: setPreference };
})();
