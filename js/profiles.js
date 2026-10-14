// Pay profile CRUD + the math that turns a profile into an effective hourly rate.
var Profiles = (function () {

  function all() {
    return Storage.getProfiles();
  }

  function find(id) {
    return all().filter(function (p) { return p.id === id; })[0] || null;
  }

  function save(profile) {
    var profiles = all();
    if (profile.id) {
      profiles = profiles.map(function (p) { return p.id === profile.id ? profile : p; });
    } else {
      profile.id = Storage.uid();
      profiles.push(profile);
    }
    Storage.setProfiles(profiles);
    return profile;
  }

  function remove(id) {
    Storage.setProfiles(all().filter(function (p) { return p.id !== id; }));
    if (Storage.getActiveProfileId() === id) {
      Storage.setActiveProfileId(null);
    }
  }

  // Hours implied by a "specific pay period" profile's date range and hours/week assumption.
  function periodHours(profile) {
    var start = new Date(profile.periodStart);
    var end = new Date(profile.periodEnd);
    var ms = end - start;
    if (!(ms > 0)) return 0;
    var weeks = ms / (7 * 24 * 3600 * 1000);
    var hoursPerWeek = Number(profile.hoursPerWeek) || 40;
    return weeks * hoursPerWeek;
  }

  // Base hourly rate before any overtime is applied.
  function baseHourlyRate(profile) {
    if (!profile) return 0;
    if (profile.mode === "salary") {
      var hoursPerWeek = Number(profile.hoursPerWeek) || 40;
      return (Number(profile.salaryAmount) || 0) / 52 / hoursPerWeek;
    }
    if (profile.mode === "period") {
      var hours = periodHours(profile);
      return hours > 0 ? (Number(profile.periodPay) || 0) / hours : 0;
    }
    return Number(profile.hourlyRate) || 0;
  }

  // Earnings for a given elapsed duration (ms), honoring an optional overtime threshold/multiplier.
  function earningsForElapsed(profile, elapsedMs) {
    var rate = baseHourlyRate(profile);
    var hours = elapsedMs / 3600000;
    if (!profile || !profile.overtimeEnabled) {
      return rate * hours;
    }
    var threshold = Number(profile.overtimeThresholdHours) || 0;
    var multiplier = Number(profile.overtimeMultiplier) || 1;
    if (hours <= threshold) {
      return rate * hours;
    }
    var regularPay = rate * threshold;
    var overtimeHours = hours - threshold;
    var overtimePay = rate * multiplier * overtimeHours;
    return regularPay + overtimePay;
  }

  // Parses a bare "yyyy-mm-dd" (from a date input) as a local date, not UTC midnight,
  // so the displayed day always matches what the user picked.
  function formatShortDate(iso) {
    var parts = String(iso).split("-");
    var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  function describeRate(profile) {
    if (!profile) return "no profile selected";
    var rate = baseHourlyRate(profile);
    var text = "$" + rate.toFixed(2) + "/hr";
    if (profile.mode === "salary") {
      text += " (from $" + Number(profile.salaryAmount).toLocaleString() + "/yr)";
    }
    if (profile.mode === "period") {
      text += " (from $" + Number(profile.periodPay).toLocaleString() + ", "
        + formatShortDate(profile.periodStart) + "–" + formatShortDate(profile.periodEnd) + ")";
    }
    if (profile.overtimeEnabled) {
      text += " · " + profile.overtimeMultiplier + "× after " + profile.overtimeThresholdHours + "h";
    }
    return text;
  }

  // Just the rate, no mode-specific context -- used on the main session display.
  function describeRateShort(profile) {
    if (!profile) return "no profile selected";
    return "$" + baseHourlyRate(profile).toFixed(2) + "/hr";
  }

  return {
    all: all,
    find: find,
    save: save,
    remove: remove,
    baseHourlyRate: baseHourlyRate,
    periodHours: periodHours,
    earningsForElapsed: earningsForElapsed,
    describeRate: describeRate,
    describeRateShort: describeRateShort
  };
})();
