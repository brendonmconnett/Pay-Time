// Passcode gate for revealing amounts, plus the inactivity timer that re-hides them.
// This is a 4-digit code hashed with SHA-256 and checked client-side with no server --
// light protection against a casual glance (over-the-shoulder, a shared device left open),
// not real security. Anyone with devtools access to this origin can bypass it entirely.
var Security = (function () {
  var inactivityHandle = null;
  var lockListeners = [];
  var ACTIVITY_EVENTS = ["mousedown", "keydown", "touchstart", "scroll"];

  function settings() {
    return Storage.getSettings().security;
  }

  function sha256Hex(text) {
    var bytes = new TextEncoder().encode(text);
    return crypto.subtle.digest("SHA-256", bytes).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) {
        return b.toString(16).padStart(2, "0");
      }).join("");
    });
  }

  function verify(passcode) {
    return sha256Hex(passcode).then(function (hash) {
      return hash === settings().passcodeHash;
    });
  }

  function setPasscode(passcode) {
    return sha256Hex(passcode).then(function (hash) {
      var s = Storage.getSettings();
      s.security.passcodeHash = hash;
      Storage.setSettings(s);
    });
  }

  function getAutoLockSeconds() {
    return settings().autoLockSeconds;
  }

  function setAutoLockSeconds(seconds) {
    var s = Storage.getSettings();
    s.security.autoLockSeconds = seconds;
    Storage.setSettings(s);
    armInactivityTimer();
  }

  function lock() {
    if (Privacy.isHidden()) return;
    Privacy.setHidden(true);
    lockListeners.forEach(function (fn) { fn(); });
  }

  function onLock(fn) {
    lockListeners.push(fn);
  }

  function armInactivityTimer() {
    clearTimeout(inactivityHandle);
    var seconds = getAutoLockSeconds();
    if (!seconds || Privacy.isHidden()) return;
    inactivityHandle = setTimeout(lock, seconds * 1000);
  }

  function disarmInactivityTimer() {
    clearTimeout(inactivityHandle);
    inactivityHandle = null;
  }

  function onActivity() {
    if (Privacy.isHidden()) return;
    armInactivityTimer();
  }

  function initActivityListeners() {
    ACTIVITY_EVENTS.forEach(function (evt) {
      document.addEventListener(evt, onActivity, { passive: true });
    });
  }

  return {
    verify: verify,
    setPasscode: setPasscode,
    getAutoLockSeconds: getAutoLockSeconds,
    setAutoLockSeconds: setAutoLockSeconds,
    armInactivityTimer: armInactivityTimer,
    disarmInactivityTimer: disarmInactivityTimer,
    initActivityListeners: initActivityListeners,
    lock: lock,
    onLock: onLock
  };
})();
