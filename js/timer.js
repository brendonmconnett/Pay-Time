// Session state machine. Elapsed time is always derived from stored timestamps,
// never accumulated in memory, so a page reload or backgrounded tab never drifts.
var Timer = (function () {
  var TICK_MS = 250;
  var tickHandle = null;
  var tickListeners = [];

  function session() { return Storage.getActiveSession(); }

  function isRunning() {
    var s = session();
    return !!s && s.status === "running";
  }

  function isPaused() {
    var s = session();
    return !!s && s.status === "paused";
  }

  function hasSession() {
    return !!session();
  }

  function elapsedMs(s) {
    s = s || session();
    if (!s) return 0;
    var reference = s.status === "paused" ? s.pausedAt : Date.now();
    return Math.max(0, reference - s.startedAt - (s.totalPausedMs || 0));
  }

  function start(profileId, goal) {
    var s = {
      profileId: profileId,
      status: "running",
      startedAt: Date.now(),
      pausedAt: null,
      totalPausedMs: 0,
      goal: goal || null,
      lastMilestoneReached: 0,
      goalNotified: false
    };
    Storage.setActiveSession(s);
    return s;
  }

  function pause() {
    var s = session();
    if (!s || s.status !== "running") return s;
    s.status = "paused";
    s.pausedAt = Date.now();
    Storage.setActiveSession(s);
    return s;
  }

  function resume() {
    var s = session();
    if (!s || s.status !== "paused") return s;
    s.totalPausedMs = (s.totalPausedMs || 0) + (Date.now() - s.pausedAt);
    s.pausedAt = null;
    s.status = "running";
    Storage.setActiveSession(s);
    return s;
  }

  function stop() {
    var s = session();
    if (!s) return null;
    var profile = Profiles.find(s.profileId);
    var duration = elapsedMs(s);
    var entry = {
      id: Storage.uid(),
      profileId: s.profileId,
      profileName: profile ? profile.name : "Deleted profile",
      startedAt: s.startedAt,
      endedAt: Date.now(),
      durationMs: duration,
      amountEarned: Profiles.earningsForElapsed(profile, duration)
    };
    var history = Storage.getHistory();
    history.unshift(entry);
    if (history.length > 50) history.length = 50;
    Storage.setHistory(history);
    Storage.clearActiveSession();
    return entry;
  }

  function updateSession(s) {
    Storage.setActiveSession(s);
  }

  function onTick(fn) {
    tickListeners.push(fn);
  }

  function startTicking() {
    if (tickHandle) return;
    tickHandle = setInterval(function () {
      var s = session();
      tickListeners.forEach(function (fn) { fn(s); });
    }, TICK_MS);
  }

  function stopTicking() {
    clearInterval(tickHandle);
    tickHandle = null;
  }

  function formatDuration(ms) {
    var totalSeconds = Math.floor(ms / 1000);
    var h = Math.floor(totalSeconds / 3600);
    var m = Math.floor((totalSeconds % 3600) / 60);
    var s = totalSeconds % 60;
    function pad(n) { return (n < 10 ? "0" : "") + n; }
    return pad(h) + ":" + pad(m) + ":" + pad(s);
  }

  return {
    session: session,
    isRunning: isRunning,
    isPaused: isPaused,
    hasSession: hasSession,
    elapsedMs: elapsedMs,
    start: start,
    pause: pause,
    resume: resume,
    stop: stop,
    updateSession: updateSession,
    onTick: onTick,
    startTicking: startTicking,
    stopTicking: stopTicking,
    formatDuration: formatDuration
  };
})();
