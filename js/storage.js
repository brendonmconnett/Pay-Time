// Thin localStorage wrapper, namespaced so export/import can grab everything at once.
var Storage = (function () {
  var PREFIX = "ptc_";

  var KEYS = {
    PROFILES: PREFIX + "profiles",
    ACTIVE_PROFILE_ID: PREFIX + "activeProfileId",
    ACTIVE_SESSION: PREFIX + "activeSession",
    HISTORY: PREFIX + "history",
    SETTINGS: PREFIX + "settings"
  };

  var DEFAULT_SETTINGS = {
    theme: "system",
    hideAmounts: false,
    notifications: {
      pauseReminder: {
        enabled: false,
        mode: "every",
        everyMinutes: 15,
        customMinutes: []
      },
      goal: {
        enabled: false,
        type: "amount",
        mode: "every",
        everyValue: 25,
        customValues: []
      }
    }
  };

  function get(key, fallback) {
    var raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function remove(key) {
    localStorage.removeItem(key);
  }

  function getProfiles() { return get(KEYS.PROFILES, []); }
  function setProfiles(profiles) { set(KEYS.PROFILES, profiles); }

  function getActiveProfileId() { return get(KEYS.ACTIVE_PROFILE_ID, null); }
  function setActiveProfileId(id) { set(KEYS.ACTIVE_PROFILE_ID, id); }

  function getActiveSession() { return get(KEYS.ACTIVE_SESSION, null); }
  function setActiveSession(session) { set(KEYS.ACTIVE_SESSION, session); }
  function clearActiveSession() { remove(KEYS.ACTIVE_SESSION); }

  function getHistory() { return get(KEYS.HISTORY, []); }
  function setHistory(history) { set(KEYS.HISTORY, history); }

  function getSettings() {
    var stored = get(KEYS.SETTINGS, {});
    return $.extend(true, {}, DEFAULT_SETTINGS, stored);
  }
  function setSettings(settings) { set(KEYS.SETTINGS, settings); }

  function exportAll() {
    var payload = {};
    $.each(KEYS, function (name, key) {
      var raw = localStorage.getItem(key);
      if (raw !== null) payload[key] = JSON.parse(raw);
    });
    payload.__exportedAt = new Date().toISOString();
    payload.__app = "pay-time-calculator";
    return payload;
  }

  function importAll(payload) {
    if (!payload || typeof payload !== "object") {
      throw new Error("That file doesn't look like a Pay Time export.");
    }
    $.each(KEYS, function (name, key) {
      if (Object.prototype.hasOwnProperty.call(payload, key)) {
        localStorage.setItem(key, JSON.stringify(payload[key]));
      }
    });
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  return {
    KEYS: KEYS,
    getProfiles: getProfiles,
    setProfiles: setProfiles,
    getActiveProfileId: getActiveProfileId,
    setActiveProfileId: setActiveProfileId,
    getActiveSession: getActiveSession,
    setActiveSession: setActiveSession,
    clearActiveSession: clearActiveSession,
    getHistory: getHistory,
    setHistory: setHistory,
    getSettings: getSettings,
    setSettings: setSettings,
    exportAll: exportAll,
    importAll: importAll,
    uid: uid
  };
})();
