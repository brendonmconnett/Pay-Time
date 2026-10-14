// Local notifications via the service worker's showNotification, so they still fire
// while the tab is backgrounded (not while fully closed -- there is no push server here).
//
// Both break reminders and session goals are checked every tick (while a session exists)
// rather than scheduled with setTimeout. setTimeout callbacks get silently dropped when a
// mobile browser suspends a backgrounded tab, so a reminder armed that way can simply never
// fire. Re-deriving "is this due yet?" from persisted timestamps on every tick means it
// always catches up as soon as the tab is running again, even if that's later than scheduled.
var Notifications = (function () {

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

  function formatGoalValue(type, value) {
    return type === "amount" ? ("$" + value.toFixed(2)) : (value + " hour" + (value === 1 ? "" : "s"));
  }

  // Called every tick while a session is paused.
  function checkPauseReminder(s) {
    var settings = Storage.getSettings().notifications.pauseReminder;
    if (!settings.enabled || s.status !== "paused") return;
    var elapsedMinutes = (Date.now() - s.pausedAt) / 60000;

    if (settings.mode === "custom") {
      var notified = s.pauseCustomNotified || [];
      var changed = false;
      (settings.customMinutes || []).forEach(function (m) {
        if (elapsedMinutes >= m && notified.indexOf(m) === -1) {
          notified.push(m);
          changed = true;
          fire("Still on a break?", "You've been on break for " + m + " minute" + (m === 1 ? "" : "s") + ".");
        }
      });
      if (changed) {
        s.pauseCustomNotified = notified;
        Timer.updateSession(s);
      }
    } else {
      var every = Number(settings.everyMinutes) || 0;
      if (every <= 0) return;
      var reached = Math.floor(elapsedMinutes / every);
      if (reached > (s.pauseEveryReached || 0)) {
        s.pauseEveryReached = reached;
        Timer.updateSession(s);
        var total = reached * every;
        fire("Still on a break?", "You've been on break for " + total + " minute" + (total === 1 ? "" : "s") + ".");
      }
    }
  }

  // Called every tick while a session is running.
  function checkGoal(s, earnings, elapsedMs) {
    var settings = Storage.getSettings().notifications.goal;
    if (!settings.enabled) return;
    var value = settings.type === "amount" ? earnings : (elapsedMs / 3600000);

    if (settings.mode === "custom") {
      var notified = s.goalCustomNotified || [];
      var changed = false;
      (settings.customValues || []).forEach(function (v) {
        if (value >= v && notified.indexOf(v) === -1) {
          notified.push(v);
          changed = true;
          fire("Goal reached", "You hit " + formatGoalValue(settings.type, v) + ".");
        }
      });
      if (changed) {
        s.goalCustomNotified = notified;
        Timer.updateSession(s);
      }
    } else {
      var every = Number(settings.everyValue) || 0;
      if (every <= 0) return;
      var reached = Math.floor(value / every);
      if (reached > (s.goalEveryReached || 0)) {
        s.goalEveryReached = reached;
        Timer.updateSession(s);
        fire("Goal reached", "You hit " + formatGoalValue(settings.type, reached * every) + ".");
      }
    }
  }

  return {
    isSupported: isSupported,
    permission: permission,
    requestPermission: requestPermission,
    checkPauseReminder: checkPauseReminder,
    checkGoal: checkGoal
  };
})();
