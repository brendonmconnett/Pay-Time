var History = (function () {

  function formatDate(ts) {
    return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
      " · " + new Date(ts).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }

  function render() {
    var $list = $("#history-list");
    var entries = Storage.getHistory();
    $list.empty();

    if (!entries.length) {
      $list.append('<li class="empty-state">No sessions yet. Start a timer to see it here.</li>');
      return;
    }

    entries.forEach(function (entry) {
      var $li = $('<li></li>');
      var $main = $('<div class="history-item__main"></div>');
      $main.append($('<span class="history-item__profile"></span>').text(entry.profileName));
      $main.append($('<span class="history-item__meta"></span>').text(
        formatDate(entry.startedAt) + " · " + Timer.formatDuration(entry.durationMs)
      ));
      var $amount = $('<span class="history-item__amount"></span>').text(Privacy.mask("$" + entry.amountEarned.toFixed(2)));
      $li.append($main).append($amount);
      $list.append($li);
    });
  }

  function clear() {
    Storage.setHistory([]);
    render();
  }

  return { render: render, clear: clear };
})();
