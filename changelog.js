const CHANGELOG_GLOBAL = "TRAIN_TO_BISHAN_CHANGELOG";
const LAST_PLAYED_VERSION_STORAGE_KEY = "train-to-bishan:last-played-version";

const changelogSummaryEl = document.querySelector("#changelogSummary");
const changelogListEl = document.querySelector("#changelogList");

function readChangelog() {
  const changelog = window[CHANGELOG_GLOBAL];

  if (!changelog || typeof changelog !== "object") {
    return { currentVersion: "0.0.0", entries: [] };
  }

  return {
    currentVersion: String(changelog.currentVersion ?? "0.0.0"),
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

function compareVersions(leftVersion, rightVersion) {
  const leftParts = String(leftVersion).split(".").map(Number);
  const rightParts = String(rightVersion).split(".").map(Number);
  const partCount = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < partCount; index += 1) {
    const leftPart = Number.isFinite(leftParts[index]) ? leftParts[index] : 0;
    const rightPart = Number.isFinite(rightParts[index]) ? rightParts[index] : 0;

    if (leftPart !== rightPart) {
      return leftPart > rightPart ? 1 : -1;
    }
  }

  return 0;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderChangelog() {
  const changelog = readChangelog();
  const lastPlayedVersion = readLastPlayedVersion();
  const newEntries = changelog.entries.filter((entry) =>
    !lastPlayedVersion || compareVersions(entry.version, lastPlayedVersion) > 0,
  );

  if (!lastPlayedVersion) {
    changelogSummaryEl.textContent =
      "No previous commute has been recorded in this browser, so all changes are marked as new.";
  } else if (newEntries.length > 0) {
    changelogSummaryEl.textContent = `New since you last played version ${lastPlayedVersion}.`;
  } else {
    changelogSummaryEl.textContent = `You last played version ${lastPlayedVersion}. No newer changes yet.`;
  }

  changelogListEl.innerHTML = changelog.entries
    .map((entry) => {
      const isNew = !lastPlayedVersion || compareVersions(entry.version, lastPlayedVersion) > 0;
      const changes = Array.isArray(entry.changes) ? entry.changes : [];

      return `
        <section class="changelog-entry${isNew ? " is-new" : ""}">
          <div class="changelog-entry-header">
            <h3>${escapeHtml(entry.title ?? `Version ${entry.version}`)}</h3>
            ${isNew ? '<span class="new-pill">New</span>' : ""}
          </div>
          <p class="changelog-meta">Version ${escapeHtml(entry.version)} &middot; ${escapeHtml(entry.date ?? "")}</p>
          <ul>
            ${changes.map((change) => `<li>${escapeHtml(change)}</li>`).join("")}
          </ul>
        </section>
      `;
    })
    .join("");
}

renderChangelog();
