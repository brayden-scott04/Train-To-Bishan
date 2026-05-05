const CHANGELOG_GLOBAL = "TRAIN_TO_BISHAN_CHANGELOG";
const LAST_PLAYED_VERSION_STORAGE_KEY = "train-to-bishan:last-played-version";

const changelogSummaryEl = document.querySelector("#changelogSummary");
const changelogListEl = document.querySelector("#changelogList");

function readChangelog() {
  const changelog = window[CHANGELOG_GLOBAL];

  if (!changelog || typeof changelog !== "object") {
    return { entries: [] };
  }

  return {
    entries: Array.isArray(changelog.entries) ? changelog.entries : [],
  };
}

function readLastPlayedVersion() {
  try {
    return window.localStorage?.getItem(LAST_PLAYED_VERSION_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatTimestamp(timestamp) {
  const timestampText = String(timestamp ?? "");
  const match = timestampText.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})([+-]\d{2}:\d{2}|Z)$/,
  );

  if (!match) {
    return timestampText;
  }

  return `${match[1]}-${match[2]}-${match[3]} ${match[4]}:${match[5]}:${match[6]} ${match[7]}`;
}

function getEntryVersion(entry) {
  return String(entry?.version ?? "").slice(0, 24);
}

function getLastPlayedIndex(entries, lastPlayedVersion) {
  if (!lastPlayedVersion) {
    return -1;
  }

  return entries.findIndex((entry) => getEntryVersion(entry) === lastPlayedVersion);
}

function renderChangelog() {
  const { entries } = readChangelog();
  const lastPlayedVersion = readLastPlayedVersion();
  const lastPlayedIndex = getLastPlayedIndex(entries, lastPlayedVersion);
  const hasRecordedCommute = Boolean(lastPlayedVersion);
  const newEntryCount =
    hasRecordedCommute && lastPlayedIndex > 0
      ? lastPlayedIndex
      : hasRecordedCommute && lastPlayedIndex === -1
        ? entries.length
        : 0;

  if (!hasRecordedCommute) {
    changelogSummaryEl.textContent =
      "Latest changes are shown below. New changes will be highlighted after your first commute in this browser.";
  } else if (lastPlayedIndex === -1) {
    changelogSummaryEl.textContent =
      "Your last played changelog version is not listed here, so visible changes are marked as new.";
  } else if (newEntryCount > 0) {
    changelogSummaryEl.textContent = `${newEntryCount} new change${newEntryCount === 1 ? "" : "s"} since your last commute.`;
  } else {
    changelogSummaryEl.textContent =
      "You last played the latest changelog version. No newer changes yet.";
  }

  changelogListEl.innerHTML = entries
    .map((entry, index) => {
      const changes = Array.isArray(entry.changes) ? entry.changes : [];
      const isNew =
        hasRecordedCommute &&
        (lastPlayedIndex === -1 || (lastPlayedIndex > -1 && index < lastPlayedIndex));
      const changesHtml =
        changes.length > 0
          ? `<ul>${changes.map((change) => `<li>${escapeHtml(change)}</li>`).join("")}</ul>`
          : "";

      return `
        <section class="changelog-entry${isNew ? " is-new" : ""}">
          <div class="changelog-entry-header">
            <h3>${escapeHtml(entry.title ?? "Change")}</h3>
            ${isNew ? '<span class="new-pill">New</span>' : ""}
          </div>
          <p class="changelog-meta">${escapeHtml(formatTimestamp(entry.timestamp))}</p>
          ${changesHtml}
        </section>
      `;
    })
    .join("");
}

renderChangelog();
