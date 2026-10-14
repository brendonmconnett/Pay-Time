$(function () {

  var editingProfileId = null;
  var lastSrAnnounceMinute = -1;

  /* ---------- Toast ---------- */

  var toastTimer = null;
  function toast(message) {
    var $toast = $("#toast").text(message).addClass("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { $toast.removeClass("is-visible"); }, 2600);
  }

  function announce(message) {
    $("#sr-status").text(message);
  }

  /* ---------- Profile select + rate display ---------- */

  function renderProfileSelect() {
    var $select = $("#profile-select");
    var profiles = Profiles.all();
    var activeId = Storage.getActiveProfileId();
    $select.empty();

    if (!profiles.length) {
      $select.append('<option value="">No profiles yet</option>');
      $select.prop("disabled", true);
      $("#rate-display").text("add a profile to get started");
      return;
    }

    $select.prop("disabled", Timer.hasSession());
    profiles.forEach(function (p) {
      $select.append($('<option></option>').attr("value", p.id).text(p.name));
    });

    if (!activeId || !Profiles.find(activeId)) {
      activeId = profiles[0].id;
      Storage.setActiveProfileId(activeId);
    }
    $select.val(activeId);
    updateRateDisplay();
  }

  function updateRateDisplay() {
    var profile = Profiles.find(Storage.getActiveProfileId());
    var text = Profiles.describeRateShort(profile);
    $("#rate-display").text(profile ? Privacy.mask(text) : text);
  }

  $("#profile-select").on("change", function () {
    Storage.setActiveProfileId($(this).val());
    updateRateDisplay();
  });

  /* ---------- Session controls ---------- */

  function setControlsForStatus(status) {
    var $card = $(".session-card");
    $card.toggleClass("is-running", status === "running");
    $("#start-btn").attr("hidden", status !== "idle");
    $("#pause-btn").attr("hidden", status !== "running");
    $("#resume-btn").attr("hidden", status !== "paused");
    $("#stop-btn").attr("hidden", status === "idle");
    $("#profile-select").prop("disabled", status !== "idle" && Profiles.all().length > 0);

    var statusText = {
      idle: "",
      running: "Earning in real time.",
      paused: "On a break — earnings are paused."
    }[status];
    $("#session-status-text").text(statusText);
  }

  function refreshUIFromSession() {
    var s = Timer.session();
    if (!s) {
      setControlsForStatus("idle");
      $("#earnings-amount").text(Privacy.mask("$0.00"));
      $("#elapsed-time").text("00:00:00");
      return;
    }
    setControlsForStatus(s.status);
    tick(s);
  }

  function tick(s) {
    s = s || Timer.session();
    if (!s) return;
    var profile = Profiles.find(s.profileId);
    var elapsed = Timer.elapsedMs(s);
    var earnings = Profiles.earningsForElapsed(profile, elapsed);

    $("#earnings-amount").text(Privacy.mask("$" + earnings.toFixed(2)));
    $("#elapsed-time").text(Timer.formatDuration(elapsed));

    if (s.status === "running") {
      Notifications.checkGoal(s, earnings, elapsed);

      var minuteMark = Math.floor(elapsed / 60000);
      if (minuteMark !== lastSrAnnounceMinute && minuteMark > 0) {
        lastSrAnnounceMinute = minuteMark;
        announce(minuteMark + " minute" + (minuteMark === 1 ? "" : "s") + " in, "
          + Privacy.mask("$" + earnings.toFixed(2)) + " earned.");
      }
    } else if (s.status === "paused") {
      Notifications.checkPauseReminder(s);
    }
  }

  // Shared by the Start button and the "Start session" PWA shortcut.
  function startSession() {
    var profileId = Storage.getActiveProfileId();
    if (!profileId) {
      toast("Add a pay profile first.");
      return false;
    }
    if (Timer.hasSession()) return false;
    lastSrAnnounceMinute = -1;
    Timer.start(profileId);
    setControlsForStatus("running");
    announce("Session started.");
    tick();
    return true;
  }

  // Shared by the Stop button and the "Stop session" PWA shortcut.
  function stopSession() {
    if (!Timer.hasSession()) return false;
    var entry = Timer.stop();
    setControlsForStatus("idle");
    renderProfileSelect();
    History.render();
    if (entry) {
      var amountText = Privacy.mask("$" + entry.amountEarned.toFixed(2));
      announce("Session saved: " + amountText + " for " + Timer.formatDuration(entry.durationMs) + ".");
      toast("Saved " + amountText + " to history.");
    }
    return true;
  }

  $("#start-btn").on("click", startSession);

  $("#pause-btn").on("click", function () {
    Timer.pause();
    setControlsForStatus("paused");
    announce("Taking a break. Timer paused.");
  });

  $("#resume-btn").on("click", function () {
    Timer.resume();
    setControlsForStatus("running");
    announce("Back to work. Timer resumed.");
  });

  $("#stop-btn").on("click", stopSession);

  $("#clear-history").on("click", function () {
    if (!Storage.getHistory().length) return;
    if (!window.confirm("Clear all session history? This cannot be undone.")) return;
    History.clear();
    toast("History cleared.");
  });

  /* ---------- Profiles dialog ---------- */

  var $profilesDialog = $("#profiles-dialog")[0];

  function renderProfilesList() {
    var $list = $("#profiles-list");
    var profiles = Profiles.all();
    var activeId = Storage.getActiveProfileId();
    $list.empty();

    if (!profiles.length) {
      $list.append('<li class="empty-state">No profiles yet.</li>');
      return;
    }

    profiles.forEach(function (p) {
      var $li = $('<li></li>').toggleClass("is-active", p.id === activeId);
      var $main = $('<div></div>');
      $main.append($('<div class="profile-item__name"></div>').text(p.name));
      $main.append($('<div class="profile-item__rate"></div>').text(Privacy.mask(Profiles.describeRate(p))));
      var $actions = $('<div class="profile-item__actions"></div>');
      var $edit = $('<button type="button">Edit</button>').on("click", function () { startEditProfile(p.id); });
      var $del = $('<button type="button" class="danger">Delete</button>').on("click", function () { confirmDeleteProfile(p.id); });
      $actions.append($edit).append($del);
      $li.append($main).append($actions);
      $list.append($li);
    });
  }

  function resetProfileForm() {
    editingProfileId = null;
    $("#profile-form-heading").text("Add a profile");
    $("#cancel-profile-edit").attr("hidden", true);
    $("#profile-name").val("");
    $("#profile-mode").val("hourly");
    $("#profile-hourly-rate").val("");
    $("#profile-salary-amount").val("");
    $("#profile-period-start").val("");
    $("#profile-period-end").val("");
    $("#profile-period-pay").val("");
    $("#profile-hours-per-week").val(40);
    $("#profile-overtime-enabled").prop("checked", false);
    $("#profile-overtime-threshold").val(8);
    $("#profile-overtime-multiplier").val(1.5);
    syncProfileFormFields();
  }

  function startEditProfile(id) {
    var p = Profiles.find(id);
    if (!p) return;
    editingProfileId = id;
    $("#profile-form-heading").text("Edit profile");
    $("#cancel-profile-edit").attr("hidden", false);
    $("#profile-name").val(p.name);
    $("#profile-mode").val(p.mode);
    $("#profile-hourly-rate").val(p.hourlyRate || "");
    $("#profile-salary-amount").val(p.salaryAmount || "");
    $("#profile-period-start").val(p.periodStart || "");
    $("#profile-period-end").val(p.periodEnd || "");
    $("#profile-period-pay").val(p.periodPay || "");
    $("#profile-hours-per-week").val(p.hoursPerWeek || 40);
    $("#profile-overtime-enabled").prop("checked", !!p.overtimeEnabled);
    $("#profile-overtime-threshold").val(p.overtimeThresholdHours || 8);
    $("#profile-overtime-multiplier").val(p.overtimeMultiplier || 1.5);
    syncProfileFormFields();
    $("#profile-name").trigger("focus");
  }

  function confirmDeleteProfile(id) {
    var p = Profiles.find(id);
    if (!p) return;
    if (!window.confirm('Delete "' + p.name + '"? This cannot be undone.')) return;
    Profiles.remove(id);
    renderProfilesList();
    renderProfileSelect();
    if (editingProfileId === id) resetProfileForm();
  }

  function syncProfileFormFields() {
    var mode = $("#profile-mode").val();
    $("#hourly-field").attr("hidden", mode !== "hourly");
    $("#salary-field").attr("hidden", mode !== "salary");
    $("#period-start-field").attr("hidden", mode !== "period");
    $("#period-end-field").attr("hidden", mode !== "period");
    $("#period-pay-field").attr("hidden", mode !== "period");
    $("#hours-per-week-field").attr("hidden", mode !== "salary" && mode !== "period");

    var overtimeOn = $("#profile-overtime-enabled").is(":checked");
    $("#overtime-threshold-field").attr("hidden", !overtimeOn);
    $("#overtime-multiplier-field").attr("hidden", !overtimeOn);
  }

  $("#profile-mode, #profile-overtime-enabled").on("change", syncProfileFormFields);

  $("#manage-profiles").on("click", function () {
    renderProfilesList();
    resetProfileForm();
    document.body.classList.add("no-scroll");
    $profilesDialog.showModal();
  });

  // Native "close" fires for every close path (button, Escape, form submit), so one
  // listener is enough to always restore background scrolling.
  $profilesDialog.addEventListener("close", function () {
    document.body.classList.remove("no-scroll");
  });

  $("#profiles-dialog [data-close-dialog]").on("click", function () {
    $profilesDialog.close();
  });

  $("#cancel-profile-edit").on("click", resetProfileForm);

  $("#save-profile").on("click", function () {
    var name = $("#profile-name").val().trim();
    if (!name) { toast("Give the profile a name."); return; }
    var mode = $("#profile-mode").val();

    if (mode === "hourly" && !($("#profile-hourly-rate").val() > 0)) {
      toast("Enter an hourly rate greater than $0.");
      return;
    }
    if (mode === "salary" && !($("#profile-salary-amount").val() > 0)) {
      toast("Enter an annual salary greater than $0.");
      return;
    }
    if (mode === "period") {
      var periodStart = $("#profile-period-start").val();
      var periodEnd = $("#profile-period-end").val();
      if (!periodStart || !periodEnd) {
        toast("Pick a start and end date for the pay period.");
        return;
      }
      if (new Date(periodEnd) <= new Date(periodStart)) {
        toast("The period end date must be after the start date.");
        return;
      }
      if (!($("#profile-period-pay").val() > 0)) {
        toast("Enter the total pay for that period.");
        return;
      }
    }

    var profile = {
      id: editingProfileId,
      name: name,
      mode: mode,
      hourlyRate: parseFloat($("#profile-hourly-rate").val()) || 0,
      salaryAmount: parseFloat($("#profile-salary-amount").val()) || 0,
      periodStart: $("#profile-period-start").val(),
      periodEnd: $("#profile-period-end").val(),
      periodPay: parseFloat($("#profile-period-pay").val()) || 0,
      hoursPerWeek: parseFloat($("#profile-hours-per-week").val()) || 40,
      overtimeEnabled: $("#profile-overtime-enabled").is(":checked"),
      overtimeThresholdHours: parseFloat($("#profile-overtime-threshold").val()) || 8,
      overtimeMultiplier: parseFloat($("#profile-overtime-multiplier").val()) || 1.5
    };

    var saved = Profiles.save(profile);
    if (!Storage.getActiveProfileId()) Storage.setActiveProfileId(saved.id);
    renderProfilesList();
    renderProfileSelect();
    resetProfileForm();
    toast("Profile saved.");
  });

  /* ---------- Settings panel ---------- */

  function openSettings() {
    document.body.classList.add("no-scroll");
    $("#settings-overlay").attr("hidden", false).one("click", closeSettings);
    requestAnimationFrame(function () {
      $("#settings-overlay").addClass("is-visible");
      $("#settings-panel").attr("hidden", false);
      requestAnimationFrame(function () { $("#settings-panel").addClass("is-visible"); });
    });
    $("#settings-toggle").attr("aria-expanded", "true");
  }

  function closeSettings() {
    document.body.classList.remove("no-scroll");
    $("#settings-overlay").removeClass("is-visible");
    $("#settings-panel").removeClass("is-visible");
    $("#settings-toggle").attr("aria-expanded", "false");
    setTimeout(function () {
      $("#settings-overlay").attr("hidden", true);
      $("#settings-panel").attr("hidden", true);
    }, 220);
  }

  $("#settings-toggle").on("click", openSettings);
  $("#close-settings").on("click", closeSettings);

  function loadSettingsIntoForm() {
    var s = Storage.getSettings();
    $("#theme-select").val(s.theme);

    var pause = s.notifications.pauseReminder;
    $("#notify-pause").prop("checked", pause.enabled);
    $("#pause-mode").val(pause.mode);
    $("#pause-every-minutes").val(pause.everyMinutes);
    renderTagList("pause-custom-list", pause.customMinutes, function (v) { return v + " min"; });

    var goal = s.notifications.goal;
    $("#notify-goal").prop("checked", goal.enabled);
    $("#goal-type").val(goal.type);
    $("#goal-mode").val(goal.mode);
    $("#goal-every-value").val(goal.everyValue);
    renderTagList("goal-custom-list", goal.customValues, function (v) {
      return goal.type === "amount" ? ("$" + v) : (v + "h");
    });

    syncNotificationFieldVisibility();
    syncGoalLabels();
    updatePermissionHint();
  }

  function syncNotificationFieldVisibility() {
    var pauseOn = $("#notify-pause").is(":checked");
    var pauseCustom = $("#pause-mode").val() === "custom";
    $("#pause-mode-field, #pause-every-field, #pause-custom-field").attr("hidden", !pauseOn);
    if (pauseOn) {
      $("#pause-every-field").attr("hidden", pauseCustom);
      $("#pause-custom-field").attr("hidden", !pauseCustom);
    }

    var goalOn = $("#notify-goal").is(":checked");
    var goalCustom = $("#goal-mode").val() === "custom";
    $("#goal-type-field, #goal-mode-field, #goal-every-field, #goal-custom-field").attr("hidden", !goalOn);
    if (goalOn) {
      $("#goal-every-field").attr("hidden", goalCustom);
      $("#goal-custom-field").attr("hidden", !goalCustom);
    }
  }

  function syncGoalLabels() {
    var isAmount = $("#goal-type").val() === "amount";
    $("#goal-every-label").text(isAmount ? "Every ($)" : "Every (hours)");
    $("#goal-custom-label").text(isAmount ? "Custom targets ($)" : "Custom targets (hours)");
  }

  // Generic chip-list renderer shared by the pause-reminder and goal custom-value lists.
  function renderTagList(containerId, values, formatFn) {
    var $container = $("#" + containerId).empty();
    values = values || [];
    if (!values.length) {
      $container.append('<span class="tag-empty">None yet</span>');
      return;
    }
    values.forEach(function (v) {
      var $tag = $('<span class="tag"></span>').text(formatFn(v));
      var $remove = $('<button type="button" aria-label="Remove"><span aria-hidden="true">&times;</span></button>')
        .on("click", function () { removeTagValue(containerId, v); });
      $tag.append($remove);
      $container.append($tag);
    });
  }

  function removeTagValue(containerId, value) {
    if (containerId === "pause-custom-list") {
      var pauseList = Storage.getSettings().notifications.pauseReminder.customMinutes.filter(function (v) { return v !== value; });
      updatePauseReminderSettings({ customMinutes: pauseList });
      renderTagList("pause-custom-list", pauseList, function (v) { return v + " min"; });
    } else {
      var goalSettings = Storage.getSettings().notifications.goal;
      var goalList = goalSettings.customValues.filter(function (v) { return v !== value; });
      updateGoalSettings({ customValues: goalList });
      renderTagList("goal-custom-list", goalList, function (v) {
        return goalSettings.type === "amount" ? ("$" + v) : (v + "h");
      });
    }
  }

  function updatePauseReminderSettings(patch) {
    var settings = Storage.getSettings();
    $.extend(settings.notifications.pauseReminder, patch);
    Storage.setSettings(settings);
  }

  function updateGoalSettings(patch) {
    var settings = Storage.getSettings();
    $.extend(settings.notifications.goal, patch);
    Storage.setSettings(settings);
  }

  function persistNotificationSettings() {
    updatePauseReminderSettings({
      enabled: $("#notify-pause").is(":checked"),
      mode: $("#pause-mode").val(),
      everyMinutes: parseFloat($("#pause-every-minutes").val()) || 15
    });
    updateGoalSettings({
      enabled: $("#notify-goal").is(":checked"),
      type: $("#goal-type").val(),
      mode: $("#goal-mode").val(),
      everyValue: parseFloat($("#goal-every-value").val()) || 25
    });
  }

  $("#theme-select").on("change", function () {
    Theme.setPreference($(this).val());
  });

  $("#theme-toggle").on("click", function () {
    var current = document.documentElement.getAttribute("data-theme");
    var next = current === "dark" ? "light" : "dark";
    Theme.setPreference(next);
    $("#theme-select").val(next);
  });

  $("#hide-amounts-toggle").on("click", function () {
    var hidden = !Privacy.isHidden();
    Privacy.setHidden(hidden);
    $(this).attr("aria-pressed", hidden ? "true" : "false");
    updateRateDisplay();
    refreshUIFromSession();
    History.render();
    if ($profilesDialog.open) renderProfilesList();
    announce(hidden ? "Dollar amounts hidden." : "Dollar amounts shown.");
  });

  $("#notify-pause, #pause-mode, #notify-goal, #goal-mode").on("change", function () {
    syncNotificationFieldVisibility();
    persistNotificationSettings();
  });

  $("#goal-type").on("change", function () {
    // Custom targets entered under one goal type (dollars vs. hours) don't carry meaning
    // under the other, so switch cleanly rather than leaving stale numbers behind.
    updateGoalSettings({ customValues: [] });
    syncGoalLabels();
    syncNotificationFieldVisibility();
    persistNotificationSettings();
    renderTagList("goal-custom-list", [], function (v) { return v; });
  });

  $("#pause-every-minutes, #goal-every-value").on("change", persistNotificationSettings);

  $("#pause-custom-add").on("click", function () {
    var val = parseFloat($("#pause-custom-input").val());
    if (!(val > 0)) return;
    var list = Storage.getSettings().notifications.pauseReminder.customMinutes;
    if (list.indexOf(val) === -1) {
      list = list.concat([val]).sort(function (a, b) { return a - b; });
      updatePauseReminderSettings({ customMinutes: list });
      renderTagList("pause-custom-list", list, function (v) { return v + " min"; });
    }
    $("#pause-custom-input").val("");
  });

  $("#goal-custom-add").on("click", function () {
    var val = parseFloat($("#goal-custom-input").val());
    if (!(val > 0)) return;
    var goalSettings = Storage.getSettings().notifications.goal;
    var list = goalSettings.customValues;
    if (list.indexOf(val) === -1) {
      list = list.concat([val]).sort(function (a, b) { return a - b; });
      updateGoalSettings({ customValues: list });
      renderTagList("goal-custom-list", list, function (v) {
        return goalSettings.type === "amount" ? ("$" + v) : (v + "h");
      });
    }
    $("#goal-custom-input").val("");
  });

  function updatePermissionHint() {
    var state = Notifications.permission();
    var hint = {
      unsupported: "Notifications aren't supported in this browser.",
      granted: "Notifications are enabled.",
      denied: "Notifications are blocked in your browser settings.",
      default: "Enable notifications to get break and goal alerts."
    }[state];
    $("#notification-permission-hint").text(hint);
    $("#enable-notifications").attr("hidden", state !== "default");
  }

  $("#enable-notifications").on("click", function () {
    Notifications.requestPermission().then(function () {
      updatePermissionHint();
    });
  });

  /* ---------- Export / Import ---------- */

  $("#export-data").on("click", function () {
    var payload = Storage.exportAll();
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "pay-time-backup-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  $("#import-data").on("click", function () { $("#import-file").trigger("click"); });

  $("#import-file").on("change", function (e) {
    var file = e.target.files[0];
    if (!file) return;
    if (!window.confirm("Importing will replace all current data in this browser. Continue?")) {
      $(this).val("");
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var payload = JSON.parse(reader.result);
        Storage.importAll(payload);
        toast("Data imported. Reloading...");
        setTimeout(function () { window.location.reload(); }, 900);
      } catch (err) {
        toast("Couldn't read that file: " + err.message);
      }
    };
    reader.readAsText(file);
    $(this).val("");
  });

  /* ---------- Service worker ---------- */

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () { /* offline support is best-effort */ });
    });
  }

  /* ---------- Boot ---------- */

  Theme.init();
  Privacy.init();
  $("#hide-amounts-toggle").attr("aria-pressed", Privacy.isHidden() ? "true" : "false");
  renderProfileSelect();
  loadSettingsIntoForm();
  History.render();
  refreshUIFromSession();
  Timer.onTick(tick);
  Timer.startTicking();

  // Triggered by the PWA's long-press home-screen shortcuts ("Start session" /
  // "Stop session" in manifest.json), which just open index.html with ?action=...
  var shortcutAction = new URLSearchParams(location.search).get("action");
  if (shortcutAction === "start") {
    startSession();
  } else if (shortcutAction === "stop") {
    stopSession();
  }
  if (shortcutAction) {
    window.history.replaceState(null, "", location.pathname);
  }
});
