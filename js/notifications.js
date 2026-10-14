// Local notifications via the service worker's showNotification, so they still fire
// while the tab is backgrounded (not while fully closed -- there is no push server here).
var Notifications = (function () {
  var pauseReminderHandle = null;

  function isSupported() {
    return "Notification" in window && "serviceWorker" in navigator;
  }

  function permission() {
    return isSupported() ? Notification.permission : "unsupported";
  }

  function requestPermission() {
    if (!isSupported()) return Promise.resolve("unsupported");
    return Notification.requestPermission();
  }

  function fire(title, body) {
    if (!isSupported() || Notification.permission !== "granted") return;
    navigator.serviceWorker.getRegistration().then(function (reg) {
      if (reg) {
        reg.showNotification(title, { body: body, icon: "icons/icon-192.png", badge: "icons/icon-192.png" });
      } else {
        new Notification(title, { body: body, icon: "icons/icon-192.png" });
      }
    });
  }

  // Called on every tick while a session is running.
  function checkMilestone(s, earnings) {
    var settings = Storage.getSettings().notifications;
    if (!settings.milestoneEnabled || !settings.milestoneAmount) return;
    var step = Number(settings.milestoneAmount);
    var reached = Math.floor(earnings / step);
    if (reached > (s.lastMilestoneReached || 0)) {
      s.lastMilestoneReached = reached;
      Timer.updateSession(s);
      fire("Milestone reached", "You've earned $" + (reached * step).toFixed(2) + " this session.");
    }
  }

  function checkGoal(s, earnings, elapsedMs) {
    var settings = Storage.getSettings().notifications;
    if (!settings.goalEnabled || !s.goal || s.goalNotified) return;
    var hit = s.goal.type === "amount"
      ? earnings >= s.goal.value
      : elapsedMs >= s.goal.value * 3600000;
    if (hit) {
      s.goalNotified = true;
      Timer.updateSession(s);
      var msg = s.goal.type === "amount"
        ? "You hit your $" + s.goal.value + " goal."
        : "You hit your " + s.goal.value + "-hour goal.";
      fire("Goal reached", msg);
    }
  }

  // pausedSinceMs lets a page reload re-arm the reminder relative to when the break
  // actually started, rather than restarting the full window from scratch.
  function armPauseReminder(pausedSinceMs) {
    clearPauseReminder();
    var settings = Storage.getSettings().notifications;
    if (!settings.pauseReminderEnabled) return;
    var minutes = Number(settings.pauseReminderMinutes) || 15;
    var elapsedPause = pausedSinceMs ? (Date.now() - pausedSinceMs) : 0;
    var remaining = Math.max(0, minutes * 60000 - elapsedPause);
    pauseReminderHandle = setTimeout(function () {
      if (Timer.isPaused()) {
        fire("Still on a break?", "Tap Back to Work when you're ready to keep the timer going.");
      }
    }, remaining);
  }

  function clearPauseReminder() {
    if (pauseReminderHandle) {
      clearTimeout(pauseReminderHandle);
      pauseReminderHandle = null;
    }
  }

  return {
    isSupported: isSupported,
    permission: permission,
    requestPermission: requestPermission,
    checkMilestone: checkMilestone,
    checkGoal: checkGoal,
    armPauseReminder: armPauseReminder,
    clearPauseReminder: clearPauseReminder
  };
})();
