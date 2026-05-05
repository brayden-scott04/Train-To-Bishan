const CONFIG_PATH = "config/game-config.json";
const SCRIPT_CONFIG_GLOBAL = "TRAIN_TO_BISHAN_GAME_CONFIG";
const DEMO_SKIP_QUERY_VALUE = "true";
const USER_SETTINGS_STORAGE_KEY = "train-to-bishan:user-settings";
const LAST_PLAYED_VERSION_STORAGE_KEY = "train-to-bishan:last-played-version";
const CHANGELOG_GLOBAL = "TRAIN_TO_BISHAN_CHANGELOG";
const RANDOM_TRAIN_SOUND_MIN_GAP = 30_000;
const MIN_TRAIN_ARRIVAL_DURATION = 10_000;
const MIN_DURATION_BETWEEN_STATIONS = 10_000;
const TRAIN_SLIDE_LEAD_TIME = 6_000;
const TUNNEL_NOISE_SRC = "sounds/tunnel_noise.ogg";
const TUNNEL_NOISE_FADE_DURATION = 5_000;
const PRELOAD_IMAGE_PATHS = [
  "assets/city_hall_platform_doors_open.png",
  "assets/mrt_train_doors_open.png",
];
const DEFAULT_GAME_SETTINGS = {
  routeStations: [
    { code: "NS25", name: "City Hall" },
    { code: "NS24", name: "Dhoby Ghaut" },
    { code: "NS23", name: "Somerset" },
    { code: "NS22", name: "Orchard" },
    { code: "NS21", name: "Newton" },
    { code: "NS20", name: "Novena" },
    { code: "NS19", name: "Toa Payoh" },
    { code: "NS18", name: "Braddell" },
    { code: "NS17", name: "Bishan" },
  ],
  timing: {
    initialTrainArrivalDuration: 15_000,
    trainArrivalDuration: 15_000,
    boardingDuration: 8_000,
    durationBetweenStations: 30_000,
    stationDwellDuration: 20_000,
    stationDurations: [],
  },
  seatRush: {
    gainPerPress: 0.08,
    decayPerSecond: 0.16,
    seatThreshold: 0.95,
  },
  seatOffer: {
    chance: 0.4,
    duration: 10_000,
  },
  upright: {
    betaMin: 48,
    betaMax: 132,
    gammaMax: 50,
    staleAfter: 1600,
    checkInterval: 300,
  },
  trainSound: {
    minDelay: 45_000,
    firstMinDelay: 30_000,
    firstMaxDelay: 45_000,
    retryMinDelay: 1_500,
    retryMaxDelay: 3_000,
    defaultVolume: 1,
    maxConcurrent: 2,
  },
  audioFade: {
    duration: 500,
    tickInterval: 50,
  },
  audio: {
    masterVolume: 1,
  },
  startSound: {
    src: "sounds/train_service_ends_at_bishan.ogg",
    volume: 1,
  },
  endSound: {
    src: "sounds/yay.ogg",
    volume: 1,
  },
  auntieSound: {
    src: "sounds/auntie.ogg",
    volume: 1,
  },
  trainBreakdown: {
    chance: 0.01,
    minSteps: 500,
    maxSteps: 1000,
    manualStepsPerPress: 25,
    motionThreshold: 12.6,
    motionResetThreshold: 10.8,
    minStepInterval: 280,
    src: "sounds/evacuation.ogg",
    volume: 1,
  },
  trainDelay: {
    chance: 0.1,
    extensionDuration: 15_000,
    src: "sounds/train_delay.ogg",
    volume: 1,
  },
  doorClosingSound: {
    src: "sounds/doors_are_closing.ogg",
    volume: 1,
    leadTime: 10_000,
  },
  announcement: {
    basePath: "sounds",
    prefix: "next_station",
    nextStationPrefix: "next_station",
    arrivingPrefix: "arriving",
    extension: "ogg",
    volume: 1,
    arrivingLeadTime: 10_000,
  },
  auntieEvent: {
    chance: 0.2,
    imageSrc: "assets/auntie.png",
    scoldAfter: 5_000,
    minDuration: 20_000,
    maxDuration: 30_000,
    fadeDuration: 700,
    eyesOpenThreshold: 0.08,
    slideDuration: 2_200,
  },
  vibration: {
    actionActivation: [35, 25, 35],
    boardingStart: [70, 40, 70],
    seated: 90,
    standing: [40, 35, 40],
    arrival: [120, 50, 120],
    rushTap: 8,
  },
};

let ROUTE_STATIONS = cloneStations(DEFAULT_GAME_SETTINGS.routeStations);
let GAME_CONFIG = cloneTimingConfig(DEFAULT_GAME_SETTINGS.timing);
const DURATIONS = {
  get arrival() {
    return GAME_CONFIG.initialTrainArrivalDuration;
  },
  get boarding() {
    return GAME_CONFIG.boardingDuration;
  },
  get ride() {
    return getRideDuration();
  },
};
let SEAT_RUSH_CONFIG = { ...DEFAULT_GAME_SETTINGS.seatRush };
let SEAT_OFFER_CONFIG = { ...DEFAULT_GAME_SETTINGS.seatOffer };
let UPRIGHT = { ...DEFAULT_GAME_SETTINGS.upright };
let TRAIN_SOUND_CONFIG = { ...DEFAULT_GAME_SETTINGS.trainSound };
let AUDIO_FADE_CONFIG = { ...DEFAULT_GAME_SETTINGS.audioFade };
let AUDIO_CONFIG = { ...DEFAULT_GAME_SETTINGS.audio };
let START_SOUND_CONFIG = { ...DEFAULT_GAME_SETTINGS.startSound };
let END_SOUND_CONFIG = { ...DEFAULT_GAME_SETTINGS.endSound };
let AUNTIE_SOUND_CONFIG = { ...DEFAULT_GAME_SETTINGS.auntieSound };
let TRAIN_BREAKDOWN_CONFIG = { ...DEFAULT_GAME_SETTINGS.trainBreakdown };
let TRAIN_DELAY_CONFIG = { ...DEFAULT_GAME_SETTINGS.trainDelay };
let DOOR_CLOSING_SOUND_CONFIG = { ...DEFAULT_GAME_SETTINGS.doorClosingSound };
let ANNOUNCEMENT_CONFIG = { ...DEFAULT_GAME_SETTINGS.announcement };
let AUNTIE_CONFIG = { ...DEFAULT_GAME_SETTINGS.auntieEvent };
let VIBRATION_CONFIG = cloneVibrationConfig(DEFAULT_GAME_SETTINGS.vibration);
let BASE_GAME_SETTINGS = cloneSettingValue(DEFAULT_GAME_SETTINGS);
let USER_GAME_SETTINGS = {};
const dwellDelayExtensions = new Map();

function cloneStations(stations) {
  return stations.map((station) => ({ code: station.code, name: station.name }));
}

function cloneTimingConfig(config) {
  const timingConfig = {
    ...config,
    stationDurations: Array.isArray(config.stationDurations)
      ? [...config.stationDurations]
      : [],
  };
  const configuredArrivalDuration = Number(
    timingConfig.initialTrainArrivalDuration ?? timingConfig.trainArrivalDuration,
  );
  const fallbackArrivalDuration = DEFAULT_GAME_SETTINGS.timing.initialTrainArrivalDuration;
  const initialTrainArrivalDuration =
    Number.isFinite(configuredArrivalDuration) && configuredArrivalDuration >= 0
      ? Math.max(MIN_TRAIN_ARRIVAL_DURATION, configuredArrivalDuration)
      : fallbackArrivalDuration;
  const configuredDurationBetweenStations = Number(timingConfig.durationBetweenStations);
  const durationBetweenStations =
    Number.isFinite(configuredDurationBetweenStations) && configuredDurationBetweenStations >= 0
      ? Math.max(MIN_DURATION_BETWEEN_STATIONS, configuredDurationBetweenStations)
      : DEFAULT_GAME_SETTINGS.timing.durationBetweenStations;

  return {
    ...timingConfig,
    initialTrainArrivalDuration,
    trainArrivalDuration: initialTrainArrivalDuration,
    durationBetweenStations,
  };
}

function cloneVibrationPattern(pattern) {
  return Array.isArray(pattern) ? [...pattern] : pattern;
}

function cloneVibrationConfig(config) {
  return {
    ...config,
    actionActivation: cloneVibrationPattern(config.actionActivation),
    boardingStart: cloneVibrationPattern(config.boardingStart),
    seated: cloneVibrationPattern(config.seated),
    standing: cloneVibrationPattern(config.standing),
    arrival: cloneVibrationPattern(config.arrival),
    rushTap: cloneVibrationPattern(config.rushTap),
  };
}

function cloneSettingValue(value) {
  if (Array.isArray(value)) {
    return value.map(cloneSettingValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, cloneSettingValue(nestedValue)]),
    );
  }

  return value;
}

function mergeGameSettings(baseSettings, overrideSettings) {
  if (overrideSettings === undefined) {
    return cloneSettingValue(baseSettings);
  }

  if (Array.isArray(overrideSettings)) {
    return overrideSettings.map(cloneSettingValue);
  }

  if (
    overrideSettings &&
    typeof overrideSettings === "object" &&
    !Array.isArray(overrideSettings)
  ) {
    const mergedSettings =
      baseSettings && typeof baseSettings === "object" && !Array.isArray(baseSettings)
        ? cloneSettingValue(baseSettings)
        : {};

    Object.entries(overrideSettings).forEach(([key, value]) => {
      mergedSettings[key] = mergeGameSettings(mergedSettings[key], value);
    });

    return mergedSettings;
  }

  return overrideSettings;
}

function readDemoSkipEnabled() {
  try {
    return new URLSearchParams(window.location.search).get("skip") === DEMO_SKIP_QUERY_VALUE;
  } catch {
    return false;
  }
}

function readObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function readFiniteNumber(value, fallback) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function normalizeStations(stations) {
  if (!Array.isArray(stations)) {
    return cloneStations(DEFAULT_GAME_SETTINGS.routeStations);
  }

  const normalizedStations = stations
    .map((station) => ({
      code: typeof station?.code === "string" ? station.code.trim() : "",
      name: typeof station?.name === "string" ? station.name.trim() : "",
    }))
    .filter((station) => station.code && station.name);

  return normalizedStations.length >= 2
    ? normalizedStations
    : cloneStations(DEFAULT_GAME_SETTINGS.routeStations);
}

function applyGameSettings(settings) {
  const externalSettings = readObject(settings);

  ROUTE_STATIONS = normalizeStations(
    externalSettings.routeStations ?? DEFAULT_GAME_SETTINGS.routeStations,
  );
  GAME_CONFIG = cloneTimingConfig({
    ...DEFAULT_GAME_SETTINGS.timing,
    ...readObject(externalSettings.timing),
  });
  SEAT_RUSH_CONFIG = {
    ...DEFAULT_GAME_SETTINGS.seatRush,
    ...readObject(externalSettings.seatRush),
  };
  SEAT_OFFER_CONFIG = {
    ...DEFAULT_GAME_SETTINGS.seatOffer,
    ...readObject(externalSettings.seatOffer),
  };
  UPRIGHT = {
    ...DEFAULT_GAME_SETTINGS.upright,
    ...readObject(externalSettings.upright),
  };
  TRAIN_SOUND_CONFIG = {
    ...DEFAULT_GAME_SETTINGS.trainSound,
    ...readObject(externalSettings.trainSound),
  };
  TRAIN_SOUND_CONFIG.minDelay = clamp(
    readFiniteNumber(TRAIN_SOUND_CONFIG.minDelay, DEFAULT_GAME_SETTINGS.trainSound.minDelay),
    RANDOM_TRAIN_SOUND_MIN_GAP,
    60_000,
  );
  TRAIN_SOUND_CONFIG.maxDelay = getRandomCabinNoiseMaxDelay(TRAIN_SOUND_CONFIG.minDelay);
  TRAIN_SOUND_CONFIG.firstMinDelay = Math.max(
    RANDOM_TRAIN_SOUND_MIN_GAP,
    readFiniteNumber(
      TRAIN_SOUND_CONFIG.firstMinDelay,
      DEFAULT_GAME_SETTINGS.trainSound.firstMinDelay,
    ),
  );
  TRAIN_SOUND_CONFIG.firstMaxDelay = Math.max(
    TRAIN_SOUND_CONFIG.firstMinDelay,
    readFiniteNumber(
      TRAIN_SOUND_CONFIG.firstMaxDelay,
      DEFAULT_GAME_SETTINGS.trainSound.firstMaxDelay,
    ),
  );
  AUDIO_FADE_CONFIG = {
    ...DEFAULT_GAME_SETTINGS.audioFade,
    ...readObject(externalSettings.audioFade),
  };
  AUDIO_CONFIG = {
    ...DEFAULT_GAME_SETTINGS.audio,
    ...readObject(externalSettings.audio),
  };
  START_SOUND_CONFIG = {
    ...DEFAULT_GAME_SETTINGS.startSound,
    ...readObject(externalSettings.startSound),
  };
  END_SOUND_CONFIG = {
    ...DEFAULT_GAME_SETTINGS.endSound,
    ...readObject(externalSettings.endSound),
  };
  AUNTIE_SOUND_CONFIG = {
    ...DEFAULT_GAME_SETTINGS.auntieSound,
    ...readObject(externalSettings.auntieSound),
  };
  TRAIN_BREAKDOWN_CONFIG = {
    ...DEFAULT_GAME_SETTINGS.trainBreakdown,
    ...readObject(externalSettings.trainBreakdown),
  };
  TRAIN_DELAY_CONFIG = {
    ...DEFAULT_GAME_SETTINGS.trainDelay,
    ...readObject(externalSettings.trainDelay),
  };
  DOOR_CLOSING_SOUND_CONFIG = {
    ...DEFAULT_GAME_SETTINGS.doorClosingSound,
    ...readObject(externalSettings.doorClosingSound),
  };
  ANNOUNCEMENT_CONFIG = {
    ...DEFAULT_GAME_SETTINGS.announcement,
    ...readObject(externalSettings.announcement),
  };
  AUNTIE_CONFIG = {
    ...DEFAULT_GAME_SETTINGS.auntieEvent,
    ...readObject(externalSettings.auntieEvent),
  };
  VIBRATION_CONFIG = cloneVibrationConfig({
    ...DEFAULT_GAME_SETTINGS.vibration,
    ...readObject(externalSettings.vibration),
  });
}

function loadStoredGameSettings() {
  try {
    const rawSettings = window.localStorage?.getItem(USER_SETTINGS_STORAGE_KEY);

    if (!rawSettings) {
      return {};
    }

    return readObject(JSON.parse(rawSettings));
  } catch (error) {
    console.warn("Could not load saved Train to Bishan settings.", error);
    return {};
  }
}

function preloadImages(paths) {
  paths.forEach((path) => {
    const image = new Image();
    image.decoding = "async";
    image.src = path;
  });
}

function saveStoredGameSettings(settings) {
  try {
    window.localStorage?.setItem(USER_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn("Could not save Train to Bishan settings.", error);
  }
}

function clearStoredGameSettings() {
  try {
    window.localStorage?.removeItem(USER_SETTINGS_STORAGE_KEY);
  } catch (error) {
    console.warn("Could not clear saved Train to Bishan settings.", error);
  }
}

function getCurrentGameVersion() {
  const changelog = window[CHANGELOG_GLOBAL];
  const firstEntry = Array.isArray(changelog?.entries) ? changelog.entries[0] : null;
  return String(changelog?.currentVersion ?? firstEntry?.version ?? "0.0.0");
}

function readLastPlayedVersion() {
  try {
    return window.localStorage?.getItem(LAST_PLAYED_VERSION_STORAGE_KEY) ?? "";
  } catch (error) {
    console.warn("Could not read last played Train to Bishan version.", error);
    return "";
  }
}

function markCurrentGameVersionPlayed() {
  try {
    window.localStorage?.setItem(LAST_PLAYED_VERSION_STORAGE_KEY, getCurrentGameVersion());
  } catch (error) {
    console.warn("Could not save last played Train to Bishan version.", error);
  }
}

function hasNewChangelogEntries() {
  const lastPlayedVersion = readLastPlayedVersion();
  return Boolean(lastPlayedVersion) && getCurrentGameVersion() !== lastPlayedVersion;
}

function applyCurrentGameSettings() {
  applyGameSettings(mergeGameSettings(BASE_GAME_SETTINGS, USER_GAME_SETTINGS));
  resetCountdowns();
}

async function loadGameSettings() {
  const scriptConfig = readObject(window[SCRIPT_CONFIG_GLOBAL]);
  let baseSettings = DEFAULT_GAME_SETTINGS;

  try {
    const configUrl = new URL(CONFIG_PATH, window.location.href);
    configUrl.searchParams.set("cacheBust", Date.now().toString());

    const response = await fetch(configUrl, { cache: "no-store" });

    if (!response.ok) {
      if (Object.keys(scriptConfig).length > 0) {
        baseSettings = scriptConfig;
      } else {
        console.warn(`Could not load ${CONFIG_PATH}; using built-in defaults.`);
      }
    } else {
      baseSettings = await response.json();
    }
  } catch (error) {
    if (Object.keys(scriptConfig).length > 0) {
      baseSettings = scriptConfig;
    } else {
      console.warn(`Could not load ${CONFIG_PATH}; using built-in defaults.`, error);
    }
  }

  BASE_GAME_SETTINGS = cloneSettingValue(baseSettings);
  USER_GAME_SETTINGS = loadStoredGameSettings();
  applyCurrentGameSettings();
}

const gameEl = document.querySelector(".game");
const sceneEl = document.querySelector(".scene");
const trainEl = document.querySelector("#train");
const queueEl = document.querySelector("#queue");
const trainInteriorEl = document.querySelector("#trainInterior");
const auntieEventEl = document.querySelector("#auntieEvent");
const auntieImageEl = document.querySelector("#auntieImage");
const auntieVignetteEl = document.querySelector("#auntieVignette");
const sleepDimEl = document.querySelector("#sleepDim");
const statusRibbonEl = document.querySelector("#statusRibbon");
const metersEl = document.querySelector("#meters");
const primaryMeterEl = document.querySelector("#primaryMeter");
const statusTextEl = document.querySelector("#statusText");
const deviceIndicatorEl = document.querySelector("#deviceIndicator");
const currentStationNameEl = document.querySelector("#currentStationName");
const nextStationNameEl = document.querySelector("#nextStationName");
const segmentProgressEl = document.querySelector("#segmentProgress");
const messageEl = document.querySelector("#message");
const startButtonEl = document.querySelector("#startButton");
const actionButtonEl = document.querySelector("#actionButton");
const successMessageEl = document.querySelector("#successMessage");
const successRestartButtonEl = document.querySelector("#successRestartButton");
const sensorFallbackEl = document.querySelector("#sensorFallback");
const uprightOverlayEl = document.querySelector("#uprightOverlay");
const routeTitleEl = document.querySelector(".title-lockup h1");
const routeSubtitleEl = document.querySelector(".title-lockup p");
const stationSignCodeEl = document.querySelector(".station-sign .line-code");
const stationSignNameEl = document.querySelector(".station-sign span:last-child");
const successHeadingEl = document.querySelector(".success-copy h2");
const successStationCodeEl = document.querySelector(".success-copy .line-code");
const skipButtonEl = document.querySelector("#skipButton");
const settingsScreenEl = document.querySelector("#settingsScreen");
const settingsButtonEl = document.querySelector("#settingsButton");
const settingsBackButtonEl = document.querySelector("#settingsBackButton");
const settingsFormEl = document.querySelector("#settingsForm");
const settingsResetButtonEl = document.querySelector("#settingsResetButton");
const uprightTestButtonEl = document.querySelector("#uprightTestButton");
const uprightTestStatusEl = document.querySelector("#uprightTestStatus");
const stationDurationSettingsEl = document.querySelector("#stationDurationSettings");
const changelogBadgeEl = document.querySelector("#changelogBadge");
const settingsInputEls = Object.fromEntries(
  [...document.querySelectorAll("[data-setting]")].map((input) => [input.dataset.setting, input]),
);
const MAIN_SUBTITLE_HTML =
  'Experience the daily commute of the average Singaporean from the <span class="nowrap">"dis"-comfort</span> of your home!';
const DEMO_SKIP_ENABLED = readDemoSkipEnabled();
const STATUS_TEXT_DURATION = 3_000;
const STATUS_TEXT_FADE_DURATION = 420;
const AUNTIE_APPEAR_DELAY = 2_000;
let statusTextHideTimer = null;
let statusTextClearTimer = null;
let rushShakeTimer = null;
let previousBetweenStationsSettingValue = "";
let activeSettingsPreviewAudio = null;
let activeSettingsPreviewButton = null;
let sleepPointerId = null;
let uprightTestActive = false;
let uprightTestTimer = null;

const state = {
  phase: "idle",
  showingSettings: false,
  lastTick: 0,
  arrivalRemaining: DURATIONS.arrival,
  boardingRemaining: DURATIONS.boarding,
  rideRemaining: DURATIONS.ride,
  seatProgress: 0,
  seatOfferActive: false,
  seatOfferRemaining: 0,
  seatOfferStationsChecked: new Set(),
  seated: false,
  nextStationAnnouncementsPlayed: new Set(),
  arrivingAnnouncementsPlayed: new Set(),
  doorClosingAnnouncementsPlayed: new Set(),
  breakdownSegmentsChecked: new Set(),
  trainDelayStationsChecked: new Set(),
  auntieDeparturesChecked: new Set(),
  breakdownActive: false,
  breakdownSteps: 0,
  breakdownTargetSteps: 0,
  breakdownStartProgress: 0,
  breakdownTargetElapsed: 0,
  breakdownDestination: null,
  auntiePending: false,
  auntiePendingRemaining: 0,
  auntieActive: false,
  auntieSide: "left",
  auntieSleeping: false,
  auntieDimLevel: 0,
  auntieOpenElapsed: 0,
  auntieRemaining: 0,
  lastActionKey: "none:false",
  motionPermission: "unknown",
  stepMotionPermission: "unknown",
  usingSimulatedMotion: false,
  simulatedUpright: true,
  stepMotionPeakActive: false,
  lastStepAt: Number.NEGATIVE_INFINITY,
  lastStepMotionAt: 0,
  orientation: {
    beta: null,
    gamma: null,
    seenAt: 0,
  },
  uprightCheck: {
    checkedAt: Number.NEGATIVE_INFINITY,
    upright: true,
  },
};

function formatTime(ms) {
  const totalSeconds = Math.ceil(Math.max(0, ms) / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function getStationDurations() {
  const legCount = Math.max(0, ROUTE_STATIONS.length - 1);
  const configuredDurations = Array.isArray(GAME_CONFIG.stationDurations)
    ? GAME_CONFIG.stationDurations
    : [];

  return Array.from({ length: legCount }, (_, index) => {
    const fallbackDuration = GAME_CONFIG.durationBetweenStations;
    const configuredDuration = Number(configuredDurations[index] ?? fallbackDuration);
    return Number.isFinite(configuredDuration) && configuredDuration >= 0
      ? Math.max(MIN_DURATION_BETWEEN_STATIONS, configuredDuration)
      : fallbackDuration;
  });
}

function getDwellDelayKey(index) {
  const station = ROUTE_STATIONS[index + 1] ?? getDestinationStation();
  return getStationAnnouncementKey(station, "train-delay", index);
}

function getDwellDelayExtension(index) {
  const extension = Number(dwellDelayExtensions.get(getDwellDelayKey(index)) ?? 0);
  return Number.isFinite(extension) && extension > 0 ? extension : 0;
}

function getDwellDuration(index) {
  return GAME_CONFIG.stationDwellDuration + getDwellDelayExtension(index);
}

function clearDwellDelayExtensions() {
  dwellDelayExtensions.clear();
}

function getRideDuration() {
  const stationDurations = getStationDurations();
  const travelDuration = stationDurations.reduce((total, duration) => total + duration, 0);
  const dwellDuration = stationDurations
    .slice(0, -1)
    .reduce((total, _, index) => total + getDwellDuration(index), 0);
  return travelDuration + dwellDuration;
}

function getRideElapsed() {
  const rideDuration = DURATIONS.ride;

  if (state.phase !== "riding" && state.phase !== "arrived") {
    return 0;
  }

  return Math.max(0, Math.min(rideDuration, rideDuration - state.rideRemaining));
}

function getStationSegment() {
  const stationDurations = getStationDurations();
  const rideDuration = DURATIONS.ride;
  let elapsed = getRideElapsed();

  for (let index = 0; index < stationDurations.length; index += 1) {
    const duration = stationDurations[index];

    if (elapsed < duration) {
      return {
        mode: "travel",
        legIndex: index,
        current: ROUTE_STATIONS[index],
        next: ROUTE_STATIONS[index + 1],
        progress: duration > 0 ? elapsed / duration : 1,
        remaining: Math.max(0, duration - elapsed),
      };
    }

    elapsed -= duration;

    if (index < stationDurations.length - 1) {
      const dwellDuration = getDwellDuration(index);

      if (elapsed < dwellDuration) {
        return {
          mode: "dwell",
          legIndex: index,
          current: ROUTE_STATIONS[index + 1],
          next: ROUTE_STATIONS[index + 2],
          progress: 0,
          remaining: Math.max(0, dwellDuration - elapsed),
        };
      }

      elapsed -= dwellDuration;
    }
  }

  const finalStationIndex = ROUTE_STATIONS.length - 1;
  return {
    mode: "arrived",
    legIndex: Math.max(0, finalStationIndex - 1),
    current: ROUTE_STATIONS[Math.max(0, finalStationIndex - 1)],
    next: ROUTE_STATIONS[finalStationIndex],
    progress: 1,
    remaining: 0,
  };
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getSeatOfferChance() {
  const configuredChance = Number(SEAT_OFFER_CONFIG.chance);
  const fallbackChance = DEFAULT_GAME_SETTINGS.seatOffer.chance;
  return Number.isFinite(configuredChance) ? clamp(configuredChance, 0, 1) : fallbackChance;
}

function getSeatOfferDuration() {
  const configuredDuration = Number(SEAT_OFFER_CONFIG.duration);
  const fallbackDuration = DEFAULT_GAME_SETTINGS.seatOffer.duration;
  return Number.isFinite(configuredDuration) && configuredDuration >= 0
    ? configuredDuration
    : fallbackDuration;
}

function getTrainBreakdownChance() {
  const configuredChance = Number(TRAIN_BREAKDOWN_CONFIG.chance);
  const fallbackChance = DEFAULT_GAME_SETTINGS.trainBreakdown.chance;
  return Number.isFinite(configuredChance) ? clamp(configuredChance, 0, 1) : fallbackChance;
}

function getTrainBreakdownMinSteps() {
  const configuredSteps = Number(TRAIN_BREAKDOWN_CONFIG.minSteps);
  const fallbackSteps = DEFAULT_GAME_SETTINGS.trainBreakdown.minSteps;
  return Number.isFinite(configuredSteps) && configuredSteps >= 1
    ? Math.round(configuredSteps)
    : fallbackSteps;
}

function getTrainBreakdownMaxSteps() {
  const configuredSteps = Number(TRAIN_BREAKDOWN_CONFIG.maxSteps);
  const fallbackSteps = DEFAULT_GAME_SETTINGS.trainBreakdown.maxSteps;
  return Number.isFinite(configuredSteps) && configuredSteps >= 1
    ? Math.round(configuredSteps)
    : fallbackSteps;
}

function getTrainBreakdownTargetSteps() {
  const minSteps = getTrainBreakdownMinSteps();
  const maxSteps = getTrainBreakdownMaxSteps();
  const lowerSteps = Math.min(minSteps, maxSteps);
  const upperSteps = Math.max(minSteps, maxSteps);
  return Math.round(randomBetween(lowerSteps, upperSteps));
}

function getBreakdownManualStepsPerPress() {
  const configuredSteps = Number(TRAIN_BREAKDOWN_CONFIG.manualStepsPerPress);
  const fallbackSteps = DEFAULT_GAME_SETTINGS.trainBreakdown.manualStepsPerPress;
  return Number.isFinite(configuredSteps) && configuredSteps >= 1
    ? Math.round(configuredSteps)
    : fallbackSteps;
}

function getBreakdownMotionThreshold() {
  const configuredThreshold = Number(TRAIN_BREAKDOWN_CONFIG.motionThreshold);
  const fallbackThreshold = DEFAULT_GAME_SETTINGS.trainBreakdown.motionThreshold;
  return Number.isFinite(configuredThreshold) && configuredThreshold > 0
    ? configuredThreshold
    : fallbackThreshold;
}

function getBreakdownMotionResetThreshold() {
  const configuredThreshold = Number(TRAIN_BREAKDOWN_CONFIG.motionResetThreshold);
  const fallbackThreshold = DEFAULT_GAME_SETTINGS.trainBreakdown.motionResetThreshold;
  return Number.isFinite(configuredThreshold) && configuredThreshold > 0
    ? configuredThreshold
    : fallbackThreshold;
}

function getBreakdownMinStepInterval() {
  const configuredInterval = Number(TRAIN_BREAKDOWN_CONFIG.minStepInterval);
  const fallbackInterval = DEFAULT_GAME_SETTINGS.trainBreakdown.minStepInterval;
  return Number.isFinite(configuredInterval) && configuredInterval >= 0
    ? configuredInterval
    : fallbackInterval;
}

function getTrainDelayChance() {
  const configuredChance = Number(TRAIN_DELAY_CONFIG.chance);
  const fallbackChance = DEFAULT_GAME_SETTINGS.trainDelay.chance;
  return Number.isFinite(configuredChance) ? clamp(configuredChance, 0, 1) : fallbackChance;
}

function getTrainDelayExtensionDuration() {
  const configuredDuration = Number(TRAIN_DELAY_CONFIG.extensionDuration);
  const fallbackDuration = DEFAULT_GAME_SETTINGS.trainDelay.extensionDuration;
  return Number.isFinite(configuredDuration) && configuredDuration >= 0
    ? configuredDuration
    : fallbackDuration;
}

function getAuntieChance() {
  const configuredChance = Number(AUNTIE_CONFIG.chance);
  const fallbackChance = DEFAULT_GAME_SETTINGS.auntieEvent.chance;
  return Number.isFinite(configuredChance) ? clamp(configuredChance, 0, 1) : fallbackChance;
}

function getAuntieDuration() {
  const fallbackMin = DEFAULT_GAME_SETTINGS.auntieEvent.minDuration;
  const fallbackMax = DEFAULT_GAME_SETTINGS.auntieEvent.maxDuration;
  const configuredMin = Number(AUNTIE_CONFIG.minDuration);
  const configuredMax = Number(AUNTIE_CONFIG.maxDuration);
  const minDuration =
    Number.isFinite(configuredMin) && configuredMin >= 0 ? configuredMin : fallbackMin;
  const maxDuration =
    Number.isFinite(configuredMax) && configuredMax >= 0 ? configuredMax : fallbackMax;
  const lowerDuration = Math.min(minDuration, maxDuration);
  const upperDuration = Math.max(minDuration, maxDuration);
  return randomBetween(lowerDuration, upperDuration);
}

function getAuntieScoldAfter() {
  const configuredScoldAfter = Number(AUNTIE_CONFIG.scoldAfter);
  const fallbackScoldAfter = DEFAULT_GAME_SETTINGS.auntieEvent.scoldAfter;
  return Number.isFinite(configuredScoldAfter) && configuredScoldAfter > 0
    ? configuredScoldAfter
    : fallbackScoldAfter;
}

function getAuntieFadeDuration() {
  const configuredFadeDuration = Number(AUNTIE_CONFIG.fadeDuration);
  const fallbackFadeDuration = DEFAULT_GAME_SETTINGS.auntieEvent.fadeDuration;
  return Number.isFinite(configuredFadeDuration) && configuredFadeDuration > 0
    ? configuredFadeDuration
    : fallbackFadeDuration;
}

function getAuntieEyesOpenThreshold() {
  const configuredThreshold = Number(AUNTIE_CONFIG.eyesOpenThreshold);
  const fallbackThreshold = DEFAULT_GAME_SETTINGS.auntieEvent.eyesOpenThreshold;
  return Number.isFinite(configuredThreshold)
    ? clamp(configuredThreshold, 0, 1)
    : fallbackThreshold;
}

function getAuntieSlideDuration() {
  const configuredSlideDuration = Number(AUNTIE_CONFIG.slideDuration);
  const fallbackSlideDuration = DEFAULT_GAME_SETTINGS.auntieEvent.slideDuration;
  return Number.isFinite(configuredSlideDuration) && configuredSlideDuration >= 0
    ? configuredSlideDuration
    : fallbackSlideDuration;
}

function getAuntieImageSrc() {
  const configuredImageSrc =
    typeof AUNTIE_CONFIG.imageSrc === "string" ? AUNTIE_CONFIG.imageSrc.trim() : "";
  return configuredImageSrc || DEFAULT_GAME_SETTINGS.auntieEvent.imageSrc;
}

function resetAuntieEvent() {
  state.auntiePending = false;
  state.auntiePendingRemaining = 0;
  state.auntieActive = false;
  state.auntieSleeping = false;
  state.auntieDimLevel = 0;
  state.auntieOpenElapsed = 0;
  state.auntieRemaining = 0;
}

function dismissAuntieEvent() {
  resetAuntieEvent();
  state.lastActionKey = "none:false";
}

function forceStandForAuntie() {
  resetAuntieEvent();
  clearStationSeatOffer();
  state.seated = false;
  state.lastActionKey = "none:false";
  vibrate(VIBRATION_CONFIG.standing);
  showStatusText("Auntie scolded you into giving up your seat!", "danger");
}

function startAuntieEvent() {
  if (state.auntieActive || !state.seated) {
    return;
  }

  hideStatusText(true);
  state.auntieActive = true;
  state.auntieSide = Math.random() < 0.5 ? "left" : "right";
  state.auntieSleeping = false;
  state.auntieDimLevel = 0;
  state.auntieOpenElapsed = 0;
  state.auntieRemaining = getAuntieDuration();
  state.lastActionKey = "none:false";
  playAuntieSound();
}

function maybeStartAuntieEvent(stationSegment) {
  if (
    state.phase !== "riding" ||
    !state.seated ||
    state.auntieActive ||
    state.auntiePending
  ) {
    return;
  }

  const key = getStationAnnouncementKey(
    stationSegment.next,
    "auntie",
    stationSegment.legIndex,
  );

  if (state.auntieDeparturesChecked.has(key)) {
    return;
  }

  state.auntieDeparturesChecked.add(key);

  if (Math.random() < getAuntieChance()) {
    state.auntiePending = true;
    state.auntiePendingRemaining = AUNTIE_APPEAR_DELAY;
  }
}

function updateAuntieEvent(elapsed) {
  if (state.auntiePending) {
    if (state.phase !== "riding" || !state.seated || state.breakdownActive) {
      resetAuntieEvent();
      return;
    }

    state.auntiePendingRemaining -= elapsed;

    if (state.auntiePendingRemaining <= 0) {
      state.auntiePending = false;
      state.auntiePendingRemaining = 0;
      startAuntieEvent();
    }
  }

  if (!state.auntieActive) {
    return;
  }

  if (!state.seated) {
    resetAuntieEvent();
    return;
  }

  state.auntieRemaining -= elapsed;

  if (state.auntieRemaining <= 0) {
    dismissAuntieEvent();
    return;
  }

  const targetDimLevel = state.auntieSleeping ? 1 : 0;
  const fadeStep = elapsed / getAuntieFadeDuration();

  if (state.auntieDimLevel < targetDimLevel) {
    state.auntieDimLevel = Math.min(targetDimLevel, state.auntieDimLevel + fadeStep);
  } else if (state.auntieDimLevel > targetDimLevel) {
    state.auntieDimLevel = Math.max(targetDimLevel, state.auntieDimLevel - fadeStep);
  }

  if (state.auntieDimLevel <= getAuntieEyesOpenThreshold()) {
    state.auntieOpenElapsed += elapsed;
  } else {
    state.auntieOpenElapsed = 0;
  }

  if (state.auntieOpenElapsed > getAuntieScoldAfter()) {
    forceStandForAuntie();
  }
}

function startPretendSleep() {
  if (!isSleepActionActive()) {
    return;
  }

  state.auntieSleeping = true;
  render();
}

function stopPretendSleep() {
  if (!state.auntieSleeping) {
    return;
  }

  state.auntieSleeping = false;
  render();
}

function endPretendSleepPress(event = null) {
  if (
    event?.pointerId !== undefined &&
    sleepPointerId !== null &&
    event.pointerId !== sleepPointerId
  ) {
    return;
  }

  if (
    sleepPointerId !== null &&
    typeof actionButtonEl.releasePointerCapture === "function" &&
    actionButtonEl.hasPointerCapture?.(sleepPointerId)
  ) {
    actionButtonEl.releasePointerCapture(sleepPointerId);
  }

  sleepPointerId = null;
  stopPretendSleep();
}

function isSleepActionActive() {
  const action = getActionState();
  return action.enabled && action.type === "sleep";
}

function getAuntieVignetteLevel() {
  if (!state.auntieActive || state.auntieDimLevel > getAuntieEyesOpenThreshold()) {
    return 0;
  }

  return clamp(state.auntieOpenElapsed / getAuntieScoldAfter(), 0, 1);
}

function triggerRushShake() {
  if (!gameEl) {
    return;
  }

  window.clearTimeout(rushShakeTimer);
  gameEl.classList.remove("rush-shake");
  // Force the animation to restart even during rapid taps.
  void gameEl.offsetWidth;
  gameEl.classList.add("rush-shake");
  rushShakeTimer = window.setTimeout(() => {
    gameEl.classList.remove("rush-shake");
    rushShakeTimer = null;
  }, 180);
}

function resetTrainBreakdown() {
  state.breakdownActive = false;
  state.breakdownSteps = 0;
  state.breakdownTargetSteps = 0;
  state.breakdownStartProgress = 0;
  state.breakdownTargetElapsed = 0;
  state.breakdownDestination = null;
  state.stepMotionPeakActive = false;
  state.lastStepAt = Number.NEGATIVE_INFINITY;
  state.lastStepMotionAt = 0;
}

function getBreakdownStepProgress() {
  if (!state.breakdownActive || state.breakdownTargetSteps <= 0) {
    return 0;
  }

  return clamp(state.breakdownSteps / state.breakdownTargetSteps, 0, 1);
}

function getBreakdownRouteProgress() {
  const stepProgress = getBreakdownStepProgress();
  return clamp(
    state.breakdownStartProgress + (1 - state.breakdownStartProgress) * stepProgress,
    0,
    1,
  );
}

function addBreakdownSteps(steps) {
  if (!state.breakdownActive) {
    return;
  }

  const addedSteps = Number(steps);

  if (!Number.isFinite(addedSteps) || addedSteps <= 0) {
    return;
  }

  state.breakdownSteps = Math.min(
    state.breakdownTargetSteps,
    state.breakdownSteps + Math.round(addedSteps),
  );

  if (state.breakdownSteps >= state.breakdownTargetSteps) {
    completeTrainBreakdownWalk();
  }
}

function completeTrainBreakdownWalk() {
  if (!state.breakdownActive) {
    return;
  }

  const targetElapsed = clamp(state.breakdownTargetElapsed, 0, DURATIONS.ride);
  const reachedStation = state.breakdownDestination;
  resetTrainBreakdown();
  state.seated = false;
  state.rideRemaining = Math.max(0, DURATIONS.ride - targetElapsed);
  state.lastTick = performance.now();
  state.lastActionKey = "none:false";
  vibrate(VIBRATION_CONFIG.standing);

  if (state.rideRemaining <= 0) {
    finishRide();
    return;
  }

  trainSoundscape.start(performance.now());
  showStatusText(`Reached ${reachedStation?.name ?? "the station"}!`, "success");
  render();
}

function startTrainBreakdown(stationSegment) {
  if (state.breakdownActive || stationSegment.mode !== "travel") {
    return;
  }

  resetAuntieEvent();
  clearStationSeatOffer();
  state.seated = false;
  state.breakdownActive = true;
  state.breakdownSteps = 0;
  state.breakdownTargetSteps = getTrainBreakdownTargetSteps();
  state.breakdownStartProgress = stationSegment.progress;
  state.breakdownTargetElapsed = getRideElapsed() + stationSegment.remaining;
  state.breakdownDestination = stationSegment.next;
  state.stepMotionPeakActive = false;
  state.lastActionKey = "none:false";
  trainSoundscape.stop();
  tunnelNoisePlayer.stop();
  playTrainBreakdownSound();
  vibrate(VIBRATION_CONFIG.standing);
  showStatusText(`Train broke down! Walk to ${stationSegment.next.name}.`, "danger");
}

function maybeStartTrainBreakdown(stationSegment) {
  if (
    state.phase !== "riding" ||
    state.breakdownActive ||
    stationSegment.mode !== "travel"
  ) {
    return false;
  }

  const key = getStationAnnouncementKey(
    stationSegment.next,
    "breakdown",
    stationSegment.legIndex,
  );

  if (state.breakdownSegmentsChecked.has(key)) {
    return false;
  }

  state.breakdownSegmentsChecked.add(key);

  if (Math.random() >= getTrainBreakdownChance()) {
    return false;
  }

  startTrainBreakdown(stationSegment);
  return true;
}

function extendStationDwell(stationSegment, extensionDuration) {
  const extension = Number(extensionDuration);

  if (!Number.isFinite(extension) || extension <= 0) {
    return;
  }

  const key = getDwellDelayKey(stationSegment.legIndex);
  const currentExtension = getDwellDelayExtension(stationSegment.legIndex);
  dwellDelayExtensions.set(key, currentExtension + extension);
  state.rideRemaining += extension;
}

function maybeStartTrainDelay(stationSegment) {
  if (
    state.phase !== "riding" ||
    state.seated ||
    stationSegment.mode !== "dwell"
  ) {
    return false;
  }

  const key = getStationAnnouncementKey(
    stationSegment.current,
    "train-delay",
    stationSegment.legIndex,
  );

  if (state.trainDelayStationsChecked.has(key)) {
    return false;
  }

  state.trainDelayStationsChecked.add(key);

  if (Math.random() >= getTrainDelayChance()) {
    return false;
  }

  extendStationDwell(stationSegment, getTrainDelayExtensionDuration());
  playTrainDelaySound();
  return true;
}

function resetStationSeatOffer() {
  state.seatOfferActive = false;
  state.seatOfferRemaining = 0;
}

function clearStationSeatOffer() {
  resetStationSeatOffer();
  state.seatProgress = 0;
}

function startStationSeatOffer(stationSegment) {
  if (state.seated || state.seatOfferActive) {
    return;
  }

  hideStatusText(true);
  state.seatOfferActive = true;
  state.seatOfferRemaining = Math.min(getSeatOfferDuration(), stationSegment.remaining);
  state.seatProgress = 0;
  state.lastActionKey = "none:false";
  showStatusText(`Seat available at ${stationSegment.current.name}!`, "success");
}

function maybeStartStationSeatOffer(stationSegment) {
  if (
    state.phase !== "riding" ||
    state.seated ||
    state.seatOfferActive ||
    stationSegment.mode !== "dwell"
  ) {
    return;
  }

  const key = getStationAnnouncementKey(
    stationSegment.current,
    "seat-offer",
    stationSegment.legIndex,
  );

  if (state.seatOfferStationsChecked.has(key)) {
    return;
  }

  state.seatOfferStationsChecked.add(key);

  if (Math.random() < getSeatOfferChance()) {
    startStationSeatOffer(stationSegment);
  }
}

function secureStationSeatOffer() {
  clearStationSeatOffer();
  state.seated = true;
  state.lastActionKey = "none:false";
  vibrate(VIBRATION_CONFIG.seated);
  showStatusText("Seat secured!", "success");
}

function failStationSeatOffer() {
  clearStationSeatOffer();
  state.lastActionKey = "none:false";
  showStatusText("Failed to get a seat! Standing it shall be...", "danger");
}

function resolveStationSeatOffer() {
  if (state.seatProgress >= SEAT_RUSH_CONFIG.seatThreshold) {
    secureStationSeatOffer();
  } else {
    failStationSeatOffer();
  }
}

function updateStationSeatOffer(elapsed, stationSegment) {
  if (!state.seatOfferActive) {
    return;
  }

  if (state.seated) {
    clearStationSeatOffer();
    return;
  }

  if (stationSegment.mode !== "dwell") {
    resolveStationSeatOffer();
    return;
  }

  state.seatOfferRemaining = Math.max(0, state.seatOfferRemaining - elapsed);
  state.seatProgress = clamp(
    state.seatProgress - SEAT_RUSH_CONFIG.decayPerSecond * (elapsed / 1000),
    0,
    1,
  );

  if (state.seatOfferRemaining <= 0) {
    resolveStationSeatOffer();
  }
}

function getOriginStation() {
  return ROUTE_STATIONS[0];
}

function getDestinationStation() {
  return ROUTE_STATIONS[ROUTE_STATIONS.length - 1];
}

function getFirstNextStation() {
  return ROUTE_STATIONS[1] ?? getDestinationStation();
}

function getArrivingLeadTime() {
  const configuredLeadTime = Number(ANNOUNCEMENT_CONFIG.arrivingLeadTime);
  return Number.isFinite(configuredLeadTime) && configuredLeadTime >= 0
    ? configuredLeadTime
    : DEFAULT_GAME_SETTINGS.announcement.arrivingLeadTime;
}

function getDoorClosingLeadTime() {
  const configuredLeadTime = Number(DOOR_CLOSING_SOUND_CONFIG.leadTime);
  return Number.isFinite(configuredLeadTime) && configuredLeadTime >= 0
    ? configuredLeadTime
    : DEFAULT_GAME_SETTINGS.doorClosingSound.leadTime;
}

function getStationAnnouncementKey(station, type, legIndex = "") {
  return `${type}:${legIndex}:${station.code}:${station.name}`;
}

function resetCountdowns() {
  state.arrivalRemaining = DURATIONS.arrival;
  state.boardingRemaining = DURATIONS.boarding;
  state.rideRemaining = DURATIONS.ride;
}

function msToSeconds(ms) {
  return Number(ms) / 1000;
}

function secondsToMs(seconds) {
  return Math.max(0, Math.round(Number(seconds) * 1000));
}

function ratioToPercent(ratio) {
  return Number(ratio) * 100;
}

function percentToRatio(percent) {
  return clamp(Number(percent) / 100, 0, 1);
}

function getRandomCabinNoiseMaxDelay(minDelay) {
  const minSeconds = msToSeconds(minDelay);
  return secondsToMs(Math.min(60, minSeconds * 0.8 + 12));
}

function formatSettingValue(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return "";
  }

  const roundedValue = Math.round(numericValue * 100) / 100;
  return Number.isInteger(roundedValue) ? String(roundedValue) : roundedValue.toFixed(2);
}

function getSettingInput(key) {
  return settingsInputEls[key] ?? null;
}

function setSettingInputValue(key, value) {
  const input = getSettingInput(key);

  if (input) {
    input.value = formatSettingValue(value);
  }
}

function getStationDurationInputEls() {
  return [...document.querySelectorAll("[data-station-duration-index]")];
}

function renderStationDurationSettings() {
  if (!stationDurationSettingsEl) {
    return;
  }

  stationDurationSettingsEl.textContent = "";

  ROUTE_STATIONS.slice(0, -1).forEach((station, index) => {
    const nextStation = ROUTE_STATIONS[index + 1];
    const label = document.createElement("label");
    const stationLabel = document.createElement("span");
    const input = document.createElement("input");
    const unit = document.createElement("small");

    stationLabel.textContent = `${station.name} to ${nextStation.name}`;
    input.type = "number";
    input.min = "1";
    input.step = "0.5";
    input.required = true;
    input.dataset.stationDurationIndex = String(index);
    unit.textContent = "s";

    label.append(stationLabel, input, unit);
    stationDurationSettingsEl.append(label);
  });
}

function setStationDurationInputValues(durations = getStationDurations()) {
  getStationDurationInputEls().forEach((input) => {
    const index = Number(input.dataset.stationDurationIndex);
    const duration = durations[index] ?? GAME_CONFIG.durationBetweenStations;
    input.value = formatSettingValue(msToSeconds(duration));
  });
}

function setAllStationDurationInputValues(seconds) {
  getStationDurationInputEls().forEach((input) => {
    input.value = formatSettingValue(seconds);
  });
}

function hasCustomStationDurationValues(baseSeconds) {
  return getStationDurationInputEls().some((input) => {
    const duration = Number(input.value);
    return Number.isFinite(duration) && Math.abs(duration - baseSeconds) > 0.001;
  });
}

function readStationDurationSettings(globalDuration) {
  const globalSeconds = msToSeconds(globalDuration);
  const durations = getStationDurationInputEls().map((input) => {
    const value = readNumberInput(input, globalSeconds);
    return secondsToMs(value);
  });

  return durations.some((duration) => duration !== globalDuration) ? durations : [];
}

function getCurrentSettingsMasterVolume() {
  return percentToRatio(
    readSettingNumber("audio.masterVolume", ratioToPercent(AUDIO_CONFIG.masterVolume)),
  );
}

function getPreviewVolume(key, fallbackVolume) {
  return clampVolume(
    percentToRatio(readSettingNumber(key, ratioToPercent(fallbackVolume))) *
      getCurrentSettingsMasterVolume(),
  );
}

function setSettingsPreviewButtonState(button, isPlaying) {
  if (!button) {
    return;
  }

  if (isPlaying) {
    button.dataset.idleLabel = button.getAttribute("aria-label") ?? "";
    button.textContent = "stop";
    button.setAttribute("aria-label", "Stop audio preview");
    button.classList.add("active");
    return;
  }

  button.textContent = "play_arrow";
  button.classList.remove("active");

  if (button.dataset.idleLabel) {
    button.setAttribute("aria-label", button.dataset.idleLabel);
  }

  delete button.dataset.idleLabel;
}

function stopSettingsPreviewAudio() {
  if (activeSettingsPreviewAudio) {
    disposeAudio(activeSettingsPreviewAudio);
    activeSettingsPreviewAudio = null;
  }

  setSettingsPreviewButtonState(activeSettingsPreviewButton, false);
  activeSettingsPreviewButton = null;
}

function getSettingsPreviewSound(previewType) {
  switch (previewType) {
    case "random-cabin": {
      const effects = getTrainSoundEffects();
      const effect = effects[Math.floor(Math.random() * effects.length)];
      return effect
        ? {
            src: effect.src,
            volume: getPreviewVolume("trainSound.defaultVolume", effect.volume),
          }
        : null;
    }
    case "announcement":
      return {
        src: getStationAnnouncementSrc(getFirstNextStation(), "next"),
        volume: getPreviewVolume("announcement.volume", ANNOUNCEMENT_CONFIG.volume),
      };
    case "door-closing":
      return {
        src: DOOR_CLOSING_SOUND_CONFIG.src,
        volume: getPreviewVolume(
          "doorClosingSound.volume",
          DOOR_CLOSING_SOUND_CONFIG.volume ?? 1,
        ),
      };
    case "intro":
      return {
        src: START_SOUND_CONFIG.src,
        volume: getPreviewVolume("startSound.volume", START_SOUND_CONFIG.volume ?? 1),
      };
    case "victory":
      return {
        src: END_SOUND_CONFIG.src,
        volume: getPreviewVolume("endSound.volume", END_SOUND_CONFIG.volume ?? 1),
      };
    case "auntie":
      return {
        src: AUNTIE_SOUND_CONFIG.src,
        volume: getPreviewVolume("auntieSound.volume", AUNTIE_SOUND_CONFIG.volume ?? 1),
      };
    case "breakdown":
      return {
        src: TRAIN_BREAKDOWN_CONFIG.src,
        volume: getPreviewVolume(
          "trainBreakdown.volume",
          TRAIN_BREAKDOWN_CONFIG.volume ?? 1,
        ),
      };
    case "train-delay":
      return {
        src: TRAIN_DELAY_CONFIG.src,
        volume: getPreviewVolume("trainDelay.volume", TRAIN_DELAY_CONFIG.volume ?? 1),
      };
    default:
      return null;
  }
}

function clearFinishedSettingsPreview(audio, button) {
  if (activeSettingsPreviewAudio === audio) {
    activeSettingsPreviewAudio = null;
  }

  if (activeSettingsPreviewButton === button) {
    setSettingsPreviewButtonState(button, false);
    activeSettingsPreviewButton = null;
  }
}

function playSettingsAudioPreview(previewType, button) {
  if (activeSettingsPreviewAudio && activeSettingsPreviewButton === button) {
    stopSettingsPreviewAudio();
    return;
  }

  const preview = getSettingsPreviewSound(previewType);
  const src = typeof preview?.src === "string" ? preview.src.trim() : "";

  stopSettingsPreviewAudio();

  if (!src) {
    logSoundDebug("Settings preview skipped; no source configured.", { previewType });
    return;
  }

  const audio = new Audio(src);
  audio.preload = "auto";
  audio.playsInline = true;
  audio.volume = clampVolume(preview.volume);
  activeSettingsPreviewAudio = audio;
  activeSettingsPreviewButton = button;
  setSettingsPreviewButtonState(button, true);

  audio.addEventListener(
    "ended",
    () => {
      clearFinishedSettingsPreview(audio, button);
      disposeAudio(audio);
    },
    { once: true },
  );

  audio.addEventListener(
    "error",
    () => {
      clearFinishedSettingsPreview(audio, button);
      disposeAudio(audio);
      logSoundDebug("Settings preview failed to load.", { previewType, src });
    },
    { once: true },
  );

  audio
    .play()
    .then(() => {
      logSoundDebug("Settings preview playback started.", { previewType, src });
    })
    .catch((error) => {
      clearFinishedSettingsPreview(audio, button);
      disposeAudio(audio);
      logSoundDebug("Settings preview playback was blocked or failed.", {
        previewType,
        src,
        error,
      });
    });
}

function handleBetweenStationsChange(event) {
  const input = event.currentTarget;
  const previousSeconds = Number(previousBetweenStationsSettingValue);
  const nextSeconds = readSettingNumber(
    "timing.durationBetweenStations",
    msToSeconds(GAME_CONFIG.durationBetweenStations),
  );

  if (
    Number.isFinite(previousSeconds) &&
    hasCustomStationDurationValues(previousSeconds) &&
    !window.confirm("Changing Between stations will reset your custom station timings.")
  ) {
    input.value = previousBetweenStationsSettingValue;
    return;
  }

  setAllStationDurationInputValues(nextSeconds);
  previousBetweenStationsSettingValue = formatSettingValue(nextSeconds);
}

function readNumberInput(input, fallback) {
  const rawValue = typeof input?.value === "string" ? input.value.trim() : "";

  if (!rawValue) {
    return fallback;
  }

  const value = Number(rawValue);

  if (!Number.isFinite(value)) {
    return fallback;
  }

  const rawMin = input.getAttribute("min");
  const rawMax = input.getAttribute("max");
  const min = rawMin === null || rawMin === "" ? Number.NEGATIVE_INFINITY : Number(rawMin);
  const max = rawMax === null || rawMax === "" ? Number.POSITIVE_INFINITY : Number(rawMax);

  return clamp(
    value,
    Number.isFinite(min) ? min : Number.NEGATIVE_INFINITY,
    Number.isFinite(max) ? max : Number.POSITIVE_INFINITY,
  );
}

function readSettingNumber(key, fallback) {
  const input = getSettingInput(key);
  return readNumberInput(input, fallback);
}

function populateSettingsForm() {
  renderStationDurationSettings();
  setSettingInputValue(
    "timing.initialTrainArrivalDuration",
    msToSeconds(GAME_CONFIG.initialTrainArrivalDuration),
  );
  setSettingInputValue("timing.boardingDuration", msToSeconds(GAME_CONFIG.boardingDuration));
  setSettingInputValue(
    "timing.durationBetweenStations",
    msToSeconds(GAME_CONFIG.durationBetweenStations),
  );
  previousBetweenStationsSettingValue = formatSettingValue(
    msToSeconds(GAME_CONFIG.durationBetweenStations),
  );
  setStationDurationInputValues();
  setSettingInputValue(
    "timing.stationDwellDuration",
    msToSeconds(GAME_CONFIG.stationDwellDuration),
  );
  setSettingInputValue("seatRush.gainPerPress", ratioToPercent(SEAT_RUSH_CONFIG.gainPerPress));
  setSettingInputValue(
    "seatRush.decayPerSecond",
    ratioToPercent(SEAT_RUSH_CONFIG.decayPerSecond),
  );
  setSettingInputValue("seatRush.seatThreshold", ratioToPercent(SEAT_RUSH_CONFIG.seatThreshold));
  setSettingInputValue("seatOffer.chance", ratioToPercent(getSeatOfferChance()));
  setSettingInputValue("seatOffer.duration", msToSeconds(getSeatOfferDuration()));
  setSettingInputValue("upright.betaMin", UPRIGHT.betaMin);
  setSettingInputValue("upright.betaMax", UPRIGHT.betaMax);
  setSettingInputValue("upright.gammaMax", UPRIGHT.gammaMax);
  setSettingInputValue("upright.checkInterval", UPRIGHT.checkInterval);
  setSettingInputValue("upright.staleAfter", UPRIGHT.staleAfter);
  setSettingInputValue("auntieEvent.chance", ratioToPercent(getAuntieChance()));
  setSettingInputValue("auntieEvent.scoldAfter", msToSeconds(getAuntieScoldAfter()));
  setSettingInputValue("auntieEvent.minDuration", msToSeconds(AUNTIE_CONFIG.minDuration));
  setSettingInputValue("auntieEvent.maxDuration", msToSeconds(AUNTIE_CONFIG.maxDuration));
  setSettingInputValue("auntieEvent.fadeDuration", msToSeconds(getAuntieFadeDuration()));
  setSettingInputValue(
    "auntieEvent.eyesOpenThreshold",
    ratioToPercent(getAuntieEyesOpenThreshold()),
  );
  setSettingInputValue("auntieEvent.slideDuration", msToSeconds(getAuntieSlideDuration()));
  setSettingInputValue("audioFade.duration", msToSeconds(getAudioFadeDuration()));
  setSettingInputValue("trainSound.minDelay", msToSeconds(TRAIN_SOUND_CONFIG.minDelay));
  setSettingInputValue(
    "announcement.arrivingLeadTime",
    msToSeconds(getArrivingLeadTime()),
  );
  setSettingInputValue(
    "doorClosingSound.leadTime",
    msToSeconds(getDoorClosingLeadTime()),
  );
  setSettingInputValue("audio.masterVolume", ratioToPercent(AUDIO_CONFIG.masterVolume));
  setSettingInputValue(
    "trainSound.defaultVolume",
    ratioToPercent(TRAIN_SOUND_CONFIG.defaultVolume),
  );
  setSettingInputValue("announcement.volume", ratioToPercent(ANNOUNCEMENT_CONFIG.volume));
  setSettingInputValue(
    "doorClosingSound.volume",
    ratioToPercent(DOOR_CLOSING_SOUND_CONFIG.volume),
  );
  setSettingInputValue("startSound.volume", ratioToPercent(START_SOUND_CONFIG.volume));
  setSettingInputValue("endSound.volume", ratioToPercent(END_SOUND_CONFIG.volume));
  setSettingInputValue("auntieSound.volume", ratioToPercent(AUNTIE_SOUND_CONFIG.volume));
  setSettingInputValue("trainBreakdown.chance", ratioToPercent(getTrainBreakdownChance()));
  setSettingInputValue("trainBreakdown.minSteps", getTrainBreakdownMinSteps());
  setSettingInputValue("trainBreakdown.maxSteps", getTrainBreakdownMaxSteps());
  setSettingInputValue("trainBreakdown.manualStepsPerPress", getBreakdownManualStepsPerPress());
  setSettingInputValue("trainBreakdown.volume", ratioToPercent(TRAIN_BREAKDOWN_CONFIG.volume));
  setSettingInputValue("trainDelay.chance", ratioToPercent(getTrainDelayChance()));
  setSettingInputValue(
    "trainDelay.extensionDuration",
    msToSeconds(getTrainDelayExtensionDuration()),
  );
  setSettingInputValue("trainDelay.volume", ratioToPercent(TRAIN_DELAY_CONFIG.volume));
  setSettingInputValue("trainSound.maxConcurrent", TRAIN_SOUND_CONFIG.maxConcurrent);
}

function readSettingsForm() {
  const initialArrivalSeconds = readSettingNumber(
    "timing.initialTrainArrivalDuration",
    msToSeconds(GAME_CONFIG.initialTrainArrivalDuration),
  );
  const durationBetweenStations = secondsToMs(
    readSettingNumber(
      "timing.durationBetweenStations",
      msToSeconds(GAME_CONFIG.durationBetweenStations),
    ),
  );
  const betaMin = readSettingNumber("upright.betaMin", UPRIGHT.betaMin);
  const betaMax = readSettingNumber("upright.betaMax", UPRIGHT.betaMax);
  const auntieMinDuration = secondsToMs(
    readSettingNumber("auntieEvent.minDuration", msToSeconds(AUNTIE_CONFIG.minDuration)),
  );
  const auntieMaxDuration = secondsToMs(
    readSettingNumber("auntieEvent.maxDuration", msToSeconds(AUNTIE_CONFIG.maxDuration)),
  );
  const randomSoundMinDelay = secondsToMs(
    readSettingNumber("trainSound.minDelay", msToSeconds(TRAIN_SOUND_CONFIG.minDelay)),
  );

  return {
    timing: {
      initialTrainArrivalDuration: secondsToMs(initialArrivalSeconds),
      trainArrivalDuration: secondsToMs(initialArrivalSeconds),
      boardingDuration: secondsToMs(
        readSettingNumber("timing.boardingDuration", msToSeconds(GAME_CONFIG.boardingDuration)),
      ),
      durationBetweenStations,
      stationDwellDuration: secondsToMs(
        readSettingNumber(
          "timing.stationDwellDuration",
          msToSeconds(GAME_CONFIG.stationDwellDuration),
        ),
      ),
      stationDurations: readStationDurationSettings(durationBetweenStations),
    },
    seatRush: {
      gainPerPress: percentToRatio(
        readSettingNumber("seatRush.gainPerPress", ratioToPercent(SEAT_RUSH_CONFIG.gainPerPress)),
      ),
      decayPerSecond: percentToRatio(
        readSettingNumber(
          "seatRush.decayPerSecond",
          ratioToPercent(SEAT_RUSH_CONFIG.decayPerSecond),
        ),
      ),
      seatThreshold: percentToRatio(
        readSettingNumber("seatRush.seatThreshold", ratioToPercent(SEAT_RUSH_CONFIG.seatThreshold)),
      ),
    },
    seatOffer: {
      chance: percentToRatio(
        readSettingNumber("seatOffer.chance", ratioToPercent(getSeatOfferChance())),
      ),
      duration: secondsToMs(
        readSettingNumber("seatOffer.duration", msToSeconds(getSeatOfferDuration())),
      ),
    },
    upright: {
      betaMin: Math.min(betaMin, betaMax),
      betaMax: Math.max(betaMin, betaMax),
      gammaMax: readSettingNumber("upright.gammaMax", UPRIGHT.gammaMax),
      checkInterval: readSettingNumber("upright.checkInterval", UPRIGHT.checkInterval),
      staleAfter: readSettingNumber("upright.staleAfter", UPRIGHT.staleAfter),
    },
    auntieEvent: {
      chance: percentToRatio(
        readSettingNumber("auntieEvent.chance", ratioToPercent(getAuntieChance())),
      ),
      scoldAfter: secondsToMs(
        readSettingNumber("auntieEvent.scoldAfter", msToSeconds(getAuntieScoldAfter())),
      ),
      minDuration: Math.min(auntieMinDuration, auntieMaxDuration),
      maxDuration: Math.max(auntieMinDuration, auntieMaxDuration),
      fadeDuration: secondsToMs(
        readSettingNumber("auntieEvent.fadeDuration", msToSeconds(getAuntieFadeDuration())),
      ),
      eyesOpenThreshold: percentToRatio(
        readSettingNumber(
          "auntieEvent.eyesOpenThreshold",
          ratioToPercent(getAuntieEyesOpenThreshold()),
        ),
      ),
      slideDuration: secondsToMs(
        readSettingNumber("auntieEvent.slideDuration", msToSeconds(getAuntieSlideDuration())),
      ),
    },
    audioFade: {
      duration: secondsToMs(
        readSettingNumber("audioFade.duration", msToSeconds(getAudioFadeDuration())),
      ),
    },
    audio: {
      masterVolume: percentToRatio(
        readSettingNumber("audio.masterVolume", ratioToPercent(AUDIO_CONFIG.masterVolume)),
      ),
    },
    trainSound: {
      minDelay: randomSoundMinDelay,
      maxDelay: getRandomCabinNoiseMaxDelay(randomSoundMinDelay),
      defaultVolume: percentToRatio(
        readSettingNumber(
          "trainSound.defaultVolume",
          ratioToPercent(TRAIN_SOUND_CONFIG.defaultVolume),
        ),
      ),
      maxConcurrent: Math.max(
        1,
        Math.round(readSettingNumber("trainSound.maxConcurrent", TRAIN_SOUND_CONFIG.maxConcurrent)),
      ),
    },
    announcement: {
      arrivingLeadTime: secondsToMs(
        readSettingNumber("announcement.arrivingLeadTime", msToSeconds(getArrivingLeadTime())),
      ),
      volume: percentToRatio(
        readSettingNumber("announcement.volume", ratioToPercent(ANNOUNCEMENT_CONFIG.volume)),
      ),
    },
    doorClosingSound: {
      leadTime: secondsToMs(
        readSettingNumber("doorClosingSound.leadTime", msToSeconds(getDoorClosingLeadTime())),
      ),
      volume: percentToRatio(
        readSettingNumber(
          "doorClosingSound.volume",
          ratioToPercent(DOOR_CLOSING_SOUND_CONFIG.volume),
        ),
      ),
    },
    startSound: {
      volume: percentToRatio(
        readSettingNumber("startSound.volume", ratioToPercent(START_SOUND_CONFIG.volume)),
      ),
    },
    endSound: {
      volume: percentToRatio(
        readSettingNumber("endSound.volume", ratioToPercent(END_SOUND_CONFIG.volume)),
      ),
    },
    auntieSound: {
      volume: percentToRatio(
        readSettingNumber("auntieSound.volume", ratioToPercent(AUNTIE_SOUND_CONFIG.volume)),
      ),
    },
    trainBreakdown: {
      chance: percentToRatio(
        readSettingNumber("trainBreakdown.chance", ratioToPercent(getTrainBreakdownChance())),
      ),
      minSteps: Math.max(
        1,
        Math.round(readSettingNumber("trainBreakdown.minSteps", getTrainBreakdownMinSteps())),
      ),
      maxSteps: Math.max(
        1,
        Math.round(readSettingNumber("trainBreakdown.maxSteps", getTrainBreakdownMaxSteps())),
      ),
      manualStepsPerPress: Math.max(
        1,
        Math.round(
          readSettingNumber(
            "trainBreakdown.manualStepsPerPress",
            getBreakdownManualStepsPerPress(),
          ),
        ),
      ),
      volume: percentToRatio(
        readSettingNumber(
          "trainBreakdown.volume",
          ratioToPercent(TRAIN_BREAKDOWN_CONFIG.volume),
        ),
      ),
    },
    trainDelay: {
      chance: percentToRatio(
        readSettingNumber("trainDelay.chance", ratioToPercent(getTrainDelayChance())),
      ),
      extensionDuration: secondsToMs(
        readSettingNumber(
          "trainDelay.extensionDuration",
          msToSeconds(getTrainDelayExtensionDuration()),
        ),
      ),
      volume: percentToRatio(
        readSettingNumber("trainDelay.volume", ratioToPercent(TRAIN_DELAY_CONFIG.volume)),
      ),
    },
  };
}

function clearStatusTextTimers() {
  window.clearTimeout(statusTextHideTimer);
  window.clearTimeout(statusTextClearTimer);
  statusTextHideTimer = null;
  statusTextClearTimer = null;
}

function hideStatusText(immediate = false) {
  clearStatusTextTimers();
  statusTextEl.classList.remove("visible");

  if (immediate) {
    statusTextEl.hidden = true;
    statusTextEl.textContent = "";
    statusTextEl.classList.remove("success", "danger");
    return;
  }

  statusTextClearTimer = window.setTimeout(() => {
    statusTextEl.hidden = true;
    statusTextEl.textContent = "";
    statusTextEl.classList.remove("success", "danger");
    statusTextClearTimer = null;
  }, STATUS_TEXT_FADE_DURATION);
}

function showStatusText(message, tone) {
  clearStatusTextTimers();
  statusTextEl.textContent = message;
  statusTextEl.hidden = false;
  statusTextEl.classList.toggle("success", tone === "success");
  statusTextEl.classList.toggle("danger", tone === "danger");

  window.requestAnimationFrame(() => {
    statusTextEl.classList.add("visible");
  });

  statusTextHideTimer = window.setTimeout(() => {
    statusTextHideTimer = null;
    hideStatusText();
  }, STATUS_TEXT_DURATION);
}

function clampVolume(volume) {
  const numericVolume = Number(volume);

  if (!Number.isFinite(numericVolume)) {
    return TRAIN_SOUND_CONFIG.defaultVolume;
  }

  return Math.min(1, Math.max(0, numericVolume));
}

function getMasterVolume() {
  return clampVolume(AUDIO_CONFIG.masterVolume ?? 1);
}

function getEffectiveVolume(volume) {
  return clampVolume(volume) * getMasterVolume();
}

function logSoundDebug(message, detail = undefined) {
  if (detail === undefined) {
    console.info(`[Train to Bishan sound] ${message}`);
    return;
  }

  console.info(`[Train to Bishan sound] ${message}`, detail);
}

const audioFadeTimers = new WeakMap();

function getAudioFadeDuration() {
  const configuredDuration = Number(AUDIO_FADE_CONFIG.duration);
  const fallbackDuration = DEFAULT_GAME_SETTINGS.audioFade.duration;
  return Number.isFinite(configuredDuration) && configuredDuration >= 0
    ? configuredDuration
    : fallbackDuration;
}

function getAudioFadeTickInterval() {
  const configuredInterval = Number(AUDIO_FADE_CONFIG.tickInterval);
  const fallbackInterval = DEFAULT_GAME_SETTINGS.audioFade.tickInterval;
  return Number.isFinite(configuredInterval) && configuredInterval > 0
    ? configuredInterval
    : fallbackInterval;
}

function getAudioFadeState(audio) {
  if (!audioFadeTimers.has(audio)) {
    audioFadeTimers.set(audio, {
      interval: null,
      fadeOutTimer: null,
      metadataHandler: null,
    });
  }

  return audioFadeTimers.get(audio);
}

function clearAudioFadeInterval(audio) {
  const fadeState = audioFadeTimers.get(audio);

  if (!fadeState?.interval) {
    return;
  }

  window.clearInterval(fadeState.interval);
  fadeState.interval = null;
}

function clearAudioFadeOutTimer(audio) {
  const fadeState = audioFadeTimers.get(audio);

  if (!fadeState) {
    return;
  }

  if (fadeState.fadeOutTimer) {
    window.clearTimeout(fadeState.fadeOutTimer);
    fadeState.fadeOutTimer = null;
  }

  if (fadeState.metadataHandler) {
    audio.removeEventListener("loadedmetadata", fadeState.metadataHandler);
    audio.removeEventListener("durationchange", fadeState.metadataHandler);
    fadeState.metadataHandler = null;
  }
}

function clearAudioFadeTimers(audio) {
  clearAudioFadeInterval(audio);
  clearAudioFadeOutTimer(audio);
  audioFadeTimers.delete(audio);
}

function fadeAudioVolume(audio, targetVolume, duration, onComplete) {
  clearAudioFadeInterval(audio);

  const clampedTargetVolume = clampVolume(targetVolume);
  const fadeDuration = Math.max(0, duration);

  if (audio.muted || fadeDuration <= 0) {
    audio.volume = audio.muted ? 0 : clampedTargetVolume;
    onComplete?.();
    return;
  }

  const fadeState = getAudioFadeState(audio);
  const startVolume = audio.volume;
  const startedAt = performance.now();

  fadeState.interval = window.setInterval(() => {
    const elapsed = performance.now() - startedAt;
    const progress = clamp(elapsed / fadeDuration, 0, 1);
    audio.volume = startVolume + (clampedTargetVolume - startVolume) * progress;

    if (progress >= 1) {
      clearAudioFadeInterval(audio);
      onComplete?.();
    }
  }, getAudioFadeTickInterval());
}

function scheduleAudioFadeOut(audio) {
  clearAudioFadeOutTimer(audio);

  const fadeDuration = getAudioFadeDuration();

  if (audio.muted || fadeDuration <= 0) {
    return;
  }

  const schedule = () => {
    const durationSeconds = audio.duration;

    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
      return;
    }

    const remainingMs = Math.max(0, (durationSeconds - audio.currentTime) * 1000);
    const durationMs = durationSeconds * 1000;
    const effectiveFadeDuration = Math.min(fadeDuration, durationMs / 2);
    const fadeStartDelay = Math.max(0, remainingMs - effectiveFadeDuration);
    const fadeState = getAudioFadeState(audio);

    clearAudioFadeOutTimer(audio);
    fadeState.fadeOutTimer = window.setTimeout(() => {
      if (audio.paused || audio.ended) {
        return;
      }

      const latestRemainingMs = Math.max(0, (audio.duration - audio.currentTime) * 1000);
      fadeAudioVolume(audio, 0, Math.min(effectiveFadeDuration, latestRemainingMs));
    }, fadeStartDelay);
  };

  if (Number.isFinite(audio.duration) && audio.duration > 0) {
    schedule();
    return;
  }

  const fadeState = getAudioFadeState(audio);
  fadeState.metadataHandler = schedule;
  audio.addEventListener("loadedmetadata", schedule, { once: true });
  audio.addEventListener("durationchange", schedule, { once: true });
}

function prepareAudioForPlayback(audio, targetVolume) {
  const clampedTargetVolume = clampVolume(targetVolume);
  const effectiveTargetVolume = getEffectiveVolume(clampedTargetVolume);

  if (audio.muted || getAudioFadeDuration() <= 0) {
    audio.volume = audio.muted ? 0 : effectiveTargetVolume;
    return clampedTargetVolume;
  }

  audio.volume = 0;
  return clampedTargetVolume;
}

function startAudioFades(audio, targetVolume) {
  const clampedTargetVolume = getEffectiveVolume(targetVolume);

  if (audio.muted) {
    audio.volume = 0;
    return;
  }

  const fadeDuration = getAudioFadeDuration();

  if (fadeDuration <= 0) {
    audio.volume = clampedTargetVolume;
    return;
  }

  fadeAudioVolume(audio, clampedTargetVolume, fadeDuration);
  scheduleAudioFadeOut(audio);
}

function disposeAudio(audio) {
  clearAudioFadeTimers(audio);
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
}

function stopAudioWithFade(audio, onStopped) {
  clearAudioFadeOutTimer(audio);

  if (audio.muted || audio.paused || audio.ended || getAudioFadeDuration() <= 0) {
    onStopped?.();
    return;
  }

  fadeAudioVolume(audio, 0, getAudioFadeDuration(), onStopped);
}

function stopAudioWithFixedFade(audio, duration, onStopped) {
  clearAudioFadeOutTimer(audio);

  if (audio.muted || audio.paused || audio.ended || duration <= 0) {
    onStopped?.();
    return;
  }

  fadeAudioVolume(audio, 0, duration, onStopped);
}

function getTrainSoundEffects() {
  const configuredEffects = Array.isArray(window.TRAIN_SOUND_EFFECTS)
    ? window.TRAIN_SOUND_EFFECTS
    : [];

  return configuredEffects
    .map((effect) => {
      if (typeof effect === "string") {
        return {
          src: effect,
          volume: TRAIN_SOUND_CONFIG.defaultVolume,
        };
      }

      if (!effect || typeof effect.src !== "string") {
        return null;
      }

      return {
        src: effect.src,
        volume: clampVolume(effect.volume ?? TRAIN_SOUND_CONFIG.defaultVolume),
      };
    })
    .filter(Boolean);
}

let activeStartSound = null;
let activeEndSound = null;
let activeAuntieSound = null;
let activeTrainBreakdownSound = null;
let activeTrainDelaySound = null;

function clearStartSound(immediate = false) {
  if (!activeStartSound) {
    return;
  }

  const audio = activeStartSound;
  activeStartSound = null;

  if (immediate) {
    disposeAudio(audio);
    return;
  }

  stopAudioWithFade(audio, () => disposeAudio(audio));
}

function clearEndSound(immediate = false) {
  if (!activeEndSound) {
    return;
  }

  const audio = activeEndSound;
  activeEndSound = null;

  if (immediate) {
    disposeAudio(audio);
    return;
  }

  stopAudioWithFade(audio, () => disposeAudio(audio));
}

function clearAuntieSound(immediate = false) {
  if (!activeAuntieSound) {
    return;
  }

  const audio = activeAuntieSound;
  activeAuntieSound = null;

  if (immediate) {
    disposeAudio(audio);
    return;
  }

  stopAudioWithFade(audio, () => disposeAudio(audio));
}

function clearTrainDelaySound(immediate = false) {
  if (!activeTrainDelaySound) {
    return;
  }

  const audio = activeTrainDelaySound;
  activeTrainDelaySound = null;

  if (immediate) {
    disposeAudio(audio);
    return;
  }

  stopAudioWithFade(audio, () => disposeAudio(audio));
}

function clearTrainBreakdownSound(immediate = false) {
  if (!activeTrainBreakdownSound) {
    return;
  }

  const audio = activeTrainBreakdownSound;
  activeTrainBreakdownSound = null;

  if (immediate) {
    disposeAudio(audio);
    return;
  }

  stopAudioWithFade(audio, () => disposeAudio(audio));
}

function playStartSound() {
  const src = typeof START_SOUND_CONFIG.src === "string" ? START_SOUND_CONFIG.src.trim() : "";

  if (!src) {
    logSoundDebug("Start sound skipped; no source configured.");
    return;
  }

  clearStartSound();
  logSoundDebug("Playing start sound.", { src });

  const audio = new Audio(src);
  const targetVolume = prepareAudioForPlayback(audio, START_SOUND_CONFIG.volume ?? 1);
  audio.preload = "auto";
  audio.playsInline = true;
  activeStartSound = audio;

  audio.addEventListener("ended", () => {
    if (activeStartSound === audio) {
      activeStartSound = null;
    }

    disposeAudio(audio);
  });

  audio.addEventListener("error", () => {
    if (activeStartSound === audio) {
      activeStartSound = null;
    }

    disposeAudio(audio);
    logSoundDebug("Start sound failed to load.", { src });
  });

  const playAttempt = audio.play();

  if (playAttempt) {
    playAttempt
      .then(() => {
        startAudioFades(audio, targetVolume);
        logSoundDebug("Start sound playback started.", { src });
      })
      .catch((error) => {
        logSoundDebug("Start sound playback was blocked or failed.", {
          src,
          error: error?.message ?? String(error),
        });
        if (activeStartSound === audio) {
          activeStartSound = null;
        }
        disposeAudio(audio);
      });
  }
}

function playAuntieSound() {
  const src = typeof AUNTIE_SOUND_CONFIG.src === "string" ? AUNTIE_SOUND_CONFIG.src.trim() : "";

  if (!src) {
    logSoundDebug("Auntie sound skipped; no source configured.");
    return;
  }

  clearAuntieSound();
  logSoundDebug("Playing auntie sound.", { src });

  const audio = new Audio(src);
  const targetVolume = prepareAudioForPlayback(audio, AUNTIE_SOUND_CONFIG.volume ?? 1);
  audio.preload = "auto";
  audio.playsInline = true;
  activeAuntieSound = audio;

  audio.addEventListener("ended", () => {
    if (activeAuntieSound === audio) {
      activeAuntieSound = null;
    }

    disposeAudio(audio);
  });

  audio.addEventListener("error", () => {
    if (activeAuntieSound === audio) {
      activeAuntieSound = null;
    }

    disposeAudio(audio);
    logSoundDebug("Auntie sound failed to load.", { src });
  });

  const playAttempt = audio.play();

  if (playAttempt) {
    playAttempt
      .then(() => {
        startAudioFades(audio, targetVolume);
        logSoundDebug("Auntie sound playback started.", { src });
      })
      .catch((error) => {
        logSoundDebug("Auntie sound playback was blocked or failed.", {
          src,
          error: error?.message ?? String(error),
        });
        if (activeAuntieSound === audio) {
          activeAuntieSound = null;
        }
        disposeAudio(audio);
      });
  }
}

function unlockAuntieSound() {
  const src = typeof AUNTIE_SOUND_CONFIG.src === "string" ? AUNTIE_SOUND_CONFIG.src.trim() : "";

  if (!src) {
    logSoundDebug("Auntie sound unlock skipped; no source configured.");
    return;
  }

  const primer = new Audio(src);
  primer.volume = 0;
  primer.muted = true;
  primer.preload = "auto";
  primer.playsInline = true;

  const playAttempt = primer.play();

  if (playAttempt) {
    playAttempt
      .then(() => {
        primer.pause();
        primer.currentTime = 0;
        disposeAudio(primer);
        logSoundDebug("Auntie sound unlocked.", { src });
      })
      .catch((error) => {
        disposeAudio(primer);
        logSoundDebug("Auntie sound unlock failed.", {
          src,
          error: error?.message ?? String(error),
        });
      });
  } else {
    disposeAudio(primer);
  }
}

function playTrainDelaySound() {
  const src = typeof TRAIN_DELAY_CONFIG.src === "string" ? TRAIN_DELAY_CONFIG.src.trim() : "";

  if (!src) {
    logSoundDebug("Train delay sound skipped; no source configured.");
    return;
  }

  clearTrainDelaySound();
  logSoundDebug("Playing train delay sound.", { src });

  const audio = new Audio(src);
  const targetVolume = prepareAudioForPlayback(audio, TRAIN_DELAY_CONFIG.volume ?? 1);
  audio.preload = "auto";
  audio.playsInline = true;
  activeTrainDelaySound = audio;

  audio.addEventListener("ended", () => {
    if (activeTrainDelaySound === audio) {
      activeTrainDelaySound = null;
    }

    disposeAudio(audio);
  });

  audio.addEventListener("error", () => {
    if (activeTrainDelaySound === audio) {
      activeTrainDelaySound = null;
    }

    disposeAudio(audio);
    logSoundDebug("Train delay sound failed to load.", { src });
  });

  const playAttempt = audio.play();

  if (playAttempt) {
    playAttempt
      .then(() => {
        startAudioFades(audio, targetVolume);
        logSoundDebug("Train delay sound playback started.", { src });
      })
      .catch((error) => {
        logSoundDebug("Train delay sound playback was blocked or failed.", {
          src,
          error: error?.message ?? String(error),
        });
        if (activeTrainDelaySound === audio) {
          activeTrainDelaySound = null;
        }
        disposeAudio(audio);
      });
  }
}

function unlockTrainDelaySound() {
  const src = typeof TRAIN_DELAY_CONFIG.src === "string" ? TRAIN_DELAY_CONFIG.src.trim() : "";

  if (!src) {
    logSoundDebug("Train delay sound unlock skipped; no source configured.");
    return;
  }

  const primer = new Audio(src);
  primer.volume = 0;
  primer.muted = true;
  primer.preload = "auto";
  primer.playsInline = true;

  const playAttempt = primer.play();

  if (playAttempt) {
    playAttempt
      .then(() => {
        primer.pause();
        primer.currentTime = 0;
        disposeAudio(primer);
        logSoundDebug("Train delay sound unlocked.", { src });
      })
      .catch((error) => {
        disposeAudio(primer);
        logSoundDebug("Train delay sound unlock failed.", {
          src,
          error: error?.message ?? String(error),
        });
      });
  } else {
    disposeAudio(primer);
  }
}

function playTrainBreakdownSound() {
  const src =
    typeof TRAIN_BREAKDOWN_CONFIG.src === "string" ? TRAIN_BREAKDOWN_CONFIG.src.trim() : "";

  if (!src) {
    logSoundDebug("Train breakdown sound skipped; no source configured.");
    return;
  }

  clearTrainBreakdownSound();
  logSoundDebug("Playing train breakdown sound.", { src });

  const audio = new Audio(src);
  const targetVolume = prepareAudioForPlayback(audio, TRAIN_BREAKDOWN_CONFIG.volume ?? 1);
  audio.preload = "auto";
  audio.playsInline = true;
  activeTrainBreakdownSound = audio;

  audio.addEventListener("ended", () => {
    if (activeTrainBreakdownSound === audio) {
      activeTrainBreakdownSound = null;
    }

    disposeAudio(audio);
  });

  audio.addEventListener("error", () => {
    if (activeTrainBreakdownSound === audio) {
      activeTrainBreakdownSound = null;
    }

    disposeAudio(audio);
    logSoundDebug("Train breakdown sound failed to load.", { src });
  });

  const playAttempt = audio.play();

  if (playAttempt) {
    playAttempt
      .then(() => {
        startAudioFades(audio, targetVolume);
        logSoundDebug("Train breakdown sound playback started.", { src });
      })
      .catch((error) => {
        logSoundDebug("Train breakdown sound playback was blocked or failed.", {
          src,
          error: error?.message ?? String(error),
        });
        if (activeTrainBreakdownSound === audio) {
          activeTrainBreakdownSound = null;
        }
        disposeAudio(audio);
      });
  }
}

function unlockTrainBreakdownSound() {
  const src =
    typeof TRAIN_BREAKDOWN_CONFIG.src === "string" ? TRAIN_BREAKDOWN_CONFIG.src.trim() : "";

  if (!src) {
    logSoundDebug("Train breakdown sound unlock skipped; no source configured.");
    return;
  }

  const primer = new Audio(src);
  primer.volume = 0;
  primer.muted = true;
  primer.preload = "auto";
  primer.playsInline = true;

  const playAttempt = primer.play();

  if (playAttempt) {
    playAttempt
      .then(() => {
        primer.pause();
        primer.currentTime = 0;
        disposeAudio(primer);
        logSoundDebug("Train breakdown sound unlocked.", { src });
      })
      .catch((error) => {
        disposeAudio(primer);
        logSoundDebug("Train breakdown sound unlock failed.", {
          src,
          error: error?.message ?? String(error),
        });
      });
  } else {
    disposeAudio(primer);
  }
}

function playEndSound() {
  const src = typeof END_SOUND_CONFIG.src === "string" ? END_SOUND_CONFIG.src.trim() : "";

  if (!src) {
    logSoundDebug("End sound skipped; no source configured.");
    return;
  }

  clearEndSound();
  logSoundDebug("Playing end sound.", { src });

  const audio = new Audio(src);
  const targetVolume = prepareAudioForPlayback(audio, END_SOUND_CONFIG.volume ?? 1);
  audio.preload = "auto";
  audio.playsInline = true;
  activeEndSound = audio;

  audio.addEventListener("ended", () => {
    if (activeEndSound === audio) {
      activeEndSound = null;
    }

    disposeAudio(audio);
  });

  audio.addEventListener("error", () => {
    if (activeEndSound === audio) {
      activeEndSound = null;
    }

    disposeAudio(audio);
    logSoundDebug("End sound failed to load.", { src });
  });

  const playAttempt = audio.play();

  if (playAttempt) {
    playAttempt
      .then(() => {
        startAudioFades(audio, targetVolume);
        logSoundDebug("End sound playback started.", { src });
      })
      .catch((error) => {
        logSoundDebug("End sound playback was blocked or failed.", {
          src,
          error: error?.message ?? String(error),
        });
        if (activeEndSound === audio) {
          activeEndSound = null;
        }
        disposeAudio(audio);
      });
  }
}

function createDoorClosingSoundPlayer() {
  let pending = false;
  let activeAudio = null;

  function getSrc() {
    return typeof DOOR_CLOSING_SOUND_CONFIG.src === "string"
      ? DOOR_CLOSING_SOUND_CONFIG.src.trim()
      : "";
  }

  function clearActiveAudio(immediate = false) {
    if (!activeAudio) {
      return;
    }

    const audio = activeAudio;
    activeAudio = null;

    if (immediate) {
      disposeAudio(audio);
      return;
    }

    stopAudioWithFade(audio, () => disposeAudio(audio));
  }

  function createAudio(muted = false) {
    const audio = new Audio(getSrc());
    audio.volume = muted ? 0 : getEffectiveVolume(DOOR_CLOSING_SOUND_CONFIG.volume ?? 1);
    audio.muted = muted;
    audio.preload = "auto";
    audio.playsInline = true;
    return audio;
  }

  return {
    blocked: false,
    hasSound() {
      return Boolean(getSrc());
    },
    unlock() {
      if (!this.hasSound()) {
        logSoundDebug("Door closing sound unlock skipped; no source configured.");
        return;
      }

      const primer = createAudio(true);
      const playAttempt = primer.play();

      if (playAttempt) {
        playAttempt
          .then(() => {
            primer.pause();
            primer.currentTime = 0;
            logSoundDebug("Door closing sound unlocked.", { src: getSrc() });
          })
          .catch((error) => {
            logSoundDebug("Door closing sound unlock failed.", {
              src: getSrc(),
              error: error?.message ?? String(error),
            });
          });
      }
    },
    stop(immediate = false) {
      pending = false;
      this.blocked = false;
      clearActiveAudio(immediate);
    },
    play() {
      if (!this.hasSound()) {
        logSoundDebug("Door closing sound skipped; no source configured.");
        return;
      }

      pending = true;
      this.blocked = false;
      clearActiveAudio();
      logSoundDebug("Playing door closing sound.", { src: getSrc() });

      const audio = createAudio();
      const targetVolume = prepareAudioForPlayback(
        audio,
        DOOR_CLOSING_SOUND_CONFIG.volume ?? 1,
      );
      activeAudio = audio;

      audio.addEventListener("ended", () => {
        if (activeAudio === audio) {
          activeAudio = null;
        }

        disposeAudio(audio);
      });

      audio.addEventListener("error", () => {
        if (activeAudio === audio) {
          activeAudio = null;
        }

        pending = false;
        disposeAudio(audio);
        logSoundDebug("Door closing sound failed to load.", { src: getSrc() });
      });

      const playAttempt = audio.play();

      if (playAttempt) {
        playAttempt
          .then(() => {
            pending = false;
            startAudioFades(audio, targetVolume);
            logSoundDebug("Door closing sound playback started.", { src: getSrc() });
          })
          .catch((error) => {
            clearActiveAudio();

            if (error?.name === "NotAllowedError") {
              this.blocked = true;
              logSoundDebug("Door closing sound blocked by browser.", {
                src: getSrc(),
                error: error.message,
              });
              render();
            } else {
              pending = false;
              logSoundDebug("Door closing sound playback failed.", {
                src: getSrc(),
                error: error?.message ?? String(error),
              });
            }
          });
      }
    },
    enableFromGesture() {
      this.blocked = false;

      if (pending) {
        this.play();
      } else {
        this.unlock();
      }

      render();
    },
  };
}

function getStationAudioSlug(stationName) {
  return stationName
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function getAnnouncementPrefix(type) {
  if (type === "arriving") {
    return ANNOUNCEMENT_CONFIG.arrivingPrefix ?? "arriving";
  }

  return ANNOUNCEMENT_CONFIG.nextStationPrefix ?? ANNOUNCEMENT_CONFIG.prefix ?? "next_station";
}

function getStationAnnouncementSrc(station, type) {
  const slug = getStationAudioSlug(station.name);
  const prefix = getAnnouncementPrefix(type);
  return `${ANNOUNCEMENT_CONFIG.basePath}/${prefix}_${slug}.${ANNOUNCEMENT_CONFIG.extension}`;
}

function createStationAnnouncementPlayer() {
  let pendingAnnouncement = null;
  const activeAudio = new Set();

  function clearAudio(audio, immediate = false) {
    activeAudio.delete(audio);

    if (immediate) {
      disposeAudio(audio);
      return;
    }

    stopAudioWithFade(audio, () => disposeAudio(audio));
  }

  function createAudio(station, type, muted = false) {
    const audio = new Audio(getStationAnnouncementSrc(station, type));
    audio.volume = muted ? 0 : getEffectiveVolume(ANNOUNCEMENT_CONFIG.volume);
    audio.muted = muted;
    audio.preload = "auto";
    audio.playsInline = true;
    return audio;
  }

  function isPending(station, type) {
    return pendingAnnouncement?.station === station && pendingAnnouncement?.type === type;
  }

  return {
    blocked: false,
    unlock() {
      const primer = createAudio(getFirstNextStation(), "next", true);
      logSoundDebug("Unlocking station announcement audio.", { src: primer.src });
      const playAttempt = primer.play();

      if (playAttempt) {
        playAttempt
          .then(() => {
            primer.pause();
            primer.currentTime = 0;
            logSoundDebug("Station announcement audio unlocked.", { src: primer.src });
          })
          .catch((error) => {
            logSoundDebug("Station announcement unlock failed.", {
              src: primer.src,
              error: error?.message ?? String(error),
            });
          });
      }
    },
    stop(immediate = false) {
      pendingAnnouncement = null;
      this.blocked = false;
      activeAudio.forEach((audio) => clearAudio(audio, immediate));
      activeAudio.clear();
    },
    playStationAnnouncement(station, type) {
      pendingAnnouncement = { station, type };
      this.blocked = false;

      const audio = createAudio(station, type);
      const targetVolume = prepareAudioForPlayback(audio, ANNOUNCEMENT_CONFIG.volume);
      activeAudio.add(audio);
      const src = audio.src;
      logSoundDebug("Playing station announcement.", {
        type,
        station: station.name,
        src,
      });

      audio.addEventListener("ended", () => {
        clearAudio(audio);
      });

      audio.addEventListener("error", () => {
        if (isPending(station, type)) {
          pendingAnnouncement = null;
        }

        clearAudio(audio);
        logSoundDebug("Station announcement failed to load.", {
          type,
          station: station.name,
          src,
        });
      });

      const playAttempt = audio.play();

      if (playAttempt) {
        playAttempt
          .then(() => {
            if (isPending(station, type)) {
              pendingAnnouncement = null;
            }
            startAudioFades(audio, targetVolume);
            logSoundDebug("Station announcement playback started.", {
              type,
              station: station.name,
              src,
            });
          })
          .catch((error) => {
            clearAudio(audio);

            if (error?.name === "NotAllowedError") {
              this.blocked = true;
              logSoundDebug("Station announcement blocked by browser.", {
                type,
                station: station.name,
                src,
                error: error.message,
              });
              render();
            } else if (isPending(station, type)) {
              pendingAnnouncement = null;
              logSoundDebug("Station announcement playback failed.", {
                type,
                station: station.name,
                src,
                error: error?.message ?? String(error),
              });
            } else {
              logSoundDebug("Station announcement playback failed.", {
                type,
                station: station.name,
                src,
                error: error?.message ?? String(error),
              });
            }
          });
      }
    },
    playNextStation(station) {
      this.playStationAnnouncement(station, "next");
    },
    playArrivingAtStation(station) {
      this.playStationAnnouncement(station, "arriving");
    },
    enableFromGesture() {
      this.blocked = false;

      if (pendingAnnouncement) {
        this.playStationAnnouncement(pendingAnnouncement.station, pendingAnnouncement.type);
      } else {
        this.unlock();
      }

      render();
    },
  };
}

function createTrainSoundscape() {
  let effects = getTrainSoundEffects();
  const activeAudio = new Set();

  function refresh() {
    effects = getTrainSoundEffects();
  }

  function clearAudio(audio, immediate = false) {
    activeAudio.delete(audio);

    if (immediate) {
      disposeAudio(audio);
      return;
    }

    stopAudioWithFade(audio, () => disposeAudio(audio));
  }

  return {
    blocked: false,
    nextAt: Number.POSITIVE_INFINITY,
    hasSounds() {
      refresh();
      return effects.length > 0;
    },
    unlock() {
      refresh();

      if (effects.length === 0) {
        logSoundDebug("Random train sound unlock skipped; playlist is empty.");
        return;
      }

      const primer = new Audio(effects[0].src);
      primer.muted = true;
      primer.volume = 0;
      primer.preload = "auto";
      primer.playsInline = true;

      const playAttempt = primer.play();

      if (playAttempt) {
        playAttempt
          .then(() => {
            primer.pause();
            primer.currentTime = 0;
            logSoundDebug("Random train sound audio unlocked.", { src: effects[0].src });
          })
          .catch((error) => {
            logSoundDebug("Random train sound unlock failed.", {
              src: effects[0].src,
              error: error?.message ?? String(error),
            });
          });
      }
    },
    start(now = performance.now()) {
      refresh();
      this.blocked = false;
      this.scheduleNext(
        now,
        TRAIN_SOUND_CONFIG.firstMinDelay,
        TRAIN_SOUND_CONFIG.firstMaxDelay,
      );
      logSoundDebug("Random train soundscape started.", { sounds: effects.length });
    },
    stop(immediate = false) {
      this.nextAt = Number.POSITIVE_INFINITY;
      activeAudio.forEach((audio) => clearAudio(audio, immediate));
      activeAudio.clear();
    },
    scheduleNext(now, min = TRAIN_SOUND_CONFIG.minDelay, max = TRAIN_SOUND_CONFIG.maxDelay) {
      refresh();
      this.nextAt =
        effects.length === 0 ? Number.POSITIVE_INFINITY : now + randomBetween(min, max);
      if (effects.length > 0) {
        logSoundDebug("Scheduled next random train sound.", {
          delayMs: Math.round(this.nextAt - now),
        });
      }
    },
    tick(now, canPlay) {
      if (state.phase !== "riding" || !canPlay || effects.length === 0) {
        return;
      }

      if (now >= this.nextAt) {
        this.playRandom();
        this.scheduleNext(now);
      }
    },
    playRandom() {
      refresh();

      if (effects.length === 0) {
        logSoundDebug("Random train sound skipped; playlist is empty.");
        return;
      }

      if (activeAudio.size >= TRAIN_SOUND_CONFIG.maxConcurrent) {
        logSoundDebug("Random train sound delayed; max concurrent sounds active.", {
          active: activeAudio.size,
        });
        this.scheduleNext(
          performance.now(),
          TRAIN_SOUND_CONFIG.retryMinDelay,
          TRAIN_SOUND_CONFIG.retryMaxDelay,
        );
        return;
      }

      const effect = effects[Math.floor(Math.random() * effects.length)];
      const audio = new Audio(effect.src);
      const src = effect.src;
      const targetVolume = prepareAudioForPlayback(audio, effect.volume);
      audio.preload = "auto";
      audio.playsInline = true;

      audio.addEventListener(
        "ended",
        () => {
          clearAudio(audio);
        },
        { once: true },
      );
      audio.addEventListener(
        "error",
        () => {
          clearAudio(audio);
          logSoundDebug("Random train sound failed to load.", { src });
        },
        { once: true },
      );

      activeAudio.add(audio);
      logSoundDebug("Playing random train sound.", { src });

      const playAttempt = audio.play();

      if (playAttempt) {
        playAttempt
          .then(() => {
            startAudioFades(audio, targetVolume);
            logSoundDebug("Random train sound playback started.", { src });
          })
          .catch((error) => {
            this.blocked = true;
            clearAudio(audio);
            logSoundDebug("Random train sound blocked or failed.", {
              src,
              error: error?.message ?? String(error),
            });
            render();
          });
      }
    },
    enableFromGesture() {
      this.blocked = false;
      this.unlock();

      if (state.phase === "riding") {
        this.playRandom();
        this.scheduleNext(performance.now());
      }

      render();
    },
  };
}

function createTunnelNoisePlayer() {
  let audio = null;
  let stoppingAudio = null;

  function clearAudio(targetAudio, immediate = false) {
    if (!targetAudio) {
      return;
    }

    if (targetAudio === audio) {
      audio = null;
    }

    if (targetAudio === stoppingAudio) {
      stoppingAudio = null;
    }

    if (immediate) {
      disposeAudio(targetAudio);
      return;
    }

    stoppingAudio = targetAudio;
    stopAudioWithFixedFade(targetAudio, TUNNEL_NOISE_FADE_DURATION, () => {
      if (stoppingAudio === targetAudio) {
        stoppingAudio = null;
      }

      disposeAudio(targetAudio);
    });
  }

  function createAudio(muted = false) {
    const nextAudio = new Audio(TUNNEL_NOISE_SRC);
    nextAudio.loop = true;
    nextAudio.muted = muted;
    nextAudio.preload = "auto";
    nextAudio.playsInline = true;
    nextAudio.volume = muted ? 0 : getEffectiveVolume(TRAIN_SOUND_CONFIG.defaultVolume);
    return nextAudio;
  }

  return {
    blocked: false,
    unlock() {
      const primer = createAudio(true);
      const playAttempt = primer.play();

      if (playAttempt) {
        playAttempt
          .then(() => {
            primer.pause();
            primer.currentTime = 0;
            disposeAudio(primer);
            logSoundDebug("Tunnel noise audio unlocked.", { src: TUNNEL_NOISE_SRC });
          })
          .catch((error) => {
            disposeAudio(primer);
            logSoundDebug("Tunnel noise unlock failed.", {
              src: TUNNEL_NOISE_SRC,
              error: error?.message ?? String(error),
            });
          });
      }
    },
    start() {
      if (audio) {
        return;
      }

      if (stoppingAudio) {
        clearAudio(stoppingAudio, true);
      }

      const nextAudio = createAudio();
      const targetVolume = clampVolume(TRAIN_SOUND_CONFIG.defaultVolume);
      nextAudio.volume = 0;
      audio = nextAudio;
      logSoundDebug("Playing tunnel noise.", { src: TUNNEL_NOISE_SRC });

      const playAttempt = nextAudio.play();

      if (playAttempt) {
        playAttempt
          .then(() => {
            fadeAudioVolume(
              nextAudio,
              getEffectiveVolume(targetVolume),
              TUNNEL_NOISE_FADE_DURATION,
            );
            this.blocked = false;
            logSoundDebug("Tunnel noise playback started.", { src: TUNNEL_NOISE_SRC });
          })
          .catch((error) => {
            this.blocked = true;
            clearAudio(nextAudio, true);
            logSoundDebug("Tunnel noise blocked or failed.", {
              src: TUNNEL_NOISE_SRC,
              error: error?.message ?? String(error),
            });
            render();
          });
      }
    },
    stop(immediate = false) {
      clearAudio(audio, immediate);
    },
    tick(canPlay, remaining = Number.POSITIVE_INFINITY) {
      if (canPlay && remaining > TUNNEL_NOISE_FADE_DURATION) {
        this.start();
        return;
      }

      this.stop();
    },
    enableFromGesture() {
      this.blocked = false;
      this.unlock();

      if (state.phase === "riding") {
        const stationSegment = getStationSegment();

        if (
          stationSegment.mode === "travel" &&
          stationSegment.remaining > TUNNEL_NOISE_FADE_DURATION
        ) {
          this.start();
        }
      }

      render();
    },
  };
}

const trainSoundscape = createTrainSoundscape();
const tunnelNoisePlayer = createTunnelNoisePlayer();
const stationAnnouncementPlayer = createStationAnnouncementPlayer();
const doorClosingPlayer = createDoorClosingSoundPlayer();
const startScreenEl = document.querySelector("#startScreen");
const playScreenEl = document.querySelector("#playScreen");
const successScreenEl = document.querySelector("#successScreen");

function mediaMatches(query) {
  return typeof window.matchMedia === "function" && window.matchMedia(query).matches;
}

function isLikelyComputer() {
  const hasMouseLikePointer = mediaMatches("(pointer: fine)");
  const canHover = mediaMatches("(hover: hover)");
  const hasCoarsePointer = mediaMatches("(pointer: coarse)");
  const mobileUserAgent = /Android|iPhone|iPad|iPod|Mobi|Mobile/i.test(navigator.userAgent);

  return (hasMouseLikePointer && canHover) || (!mobileUserAgent && !hasCoarsePointer);
}

function shouldCheckUpright() {
  return !isLikelyComputer();
}

function canUseRealMotion() {
  return "DeviceOrientationEvent" in window;
}

function canUseStepMotion() {
  return "DeviceMotionEvent" in window;
}

function realMotionIsFresh(now = performance.now()) {
  return (
    state.orientation.beta !== null &&
    state.orientation.gamma !== null &&
    now - state.orientation.seenAt < UPRIGHT.staleAfter
  );
}

function getUprightCheckInterval() {
  const configuredInterval = Number(UPRIGHT.checkInterval);
  const fallbackInterval = DEFAULT_GAME_SETTINGS.upright.checkInterval;
  return Number.isFinite(configuredInterval) && configuredInterval >= 0
    ? configuredInterval
    : fallbackInterval;
}

function isRealUpright(now = performance.now()) {
  if (!realMotionIsFresh(now)) {
    return false;
  }

  const beta = Math.abs(state.orientation.beta);
  const gamma = Math.abs(state.orientation.gamma);
  return beta >= UPRIGHT.betaMin && beta <= UPRIGHT.betaMax && gamma <= UPRIGHT.gammaMax;
}

function isPhoneUpright(now = performance.now()) {
  if (!shouldCheckUpright()) {
    return true;
  }

  if (state.usingSimulatedMotion || !canUseRealMotion()) {
    return state.simulatedUpright;
  }

  if (now - state.uprightCheck.checkedAt < getUprightCheckInterval()) {
    return state.uprightCheck.upright;
  }

  state.uprightCheck.checkedAt = now;
  state.uprightCheck.upright = isRealUpright(now);
  return state.uprightCheck.upright;
}

function isUprightForTester(now = performance.now()) {
  if (!shouldCheckUpright()) {
    return true;
  }

  if (!canUseRealMotion()) {
    return false;
  }

  const staleAfter = readSettingNumber("upright.staleAfter", UPRIGHT.staleAfter);

  if (
    state.orientation.beta === null ||
    state.orientation.gamma === null ||
    now - state.orientation.seenAt >= staleAfter
  ) {
    return false;
  }

  const betaMin = readSettingNumber("upright.betaMin", UPRIGHT.betaMin);
  const betaMax = readSettingNumber("upright.betaMax", UPRIGHT.betaMax);
  const gammaMax = readSettingNumber("upright.gammaMax", UPRIGHT.gammaMax);
  const beta = Math.abs(state.orientation.beta);
  const gamma = Math.abs(state.orientation.gamma);
  return (
    beta >= Math.min(betaMin, betaMax) &&
    beta <= Math.max(betaMin, betaMax) &&
    gamma <= gammaMax
  );
}

function setUprightTesterStatus(message, isUpright = null) {
  uprightTestStatusEl.hidden = false;
  uprightTestStatusEl.textContent = message;
  uprightTestStatusEl.classList.toggle("not-upright", isUpright === false);
}

function stopUprightTester() {
  uprightTestActive = false;
  window.clearTimeout(uprightTestTimer);
  uprightTestTimer = null;
  uprightTestButtonEl.textContent = "Test upright detection";
  uprightTestStatusEl.hidden = true;
  uprightTestStatusEl.classList.remove("not-upright");
}

function updateUprightTester() {
  if (!uprightTestActive) {
    return;
  }

  const upright = isUprightForTester();
  setUprightTesterStatus(upright ? "Upright" : "Not Upright", upright);
  const interval = readSettingNumber("upright.checkInterval", getUprightCheckInterval());
  uprightTestTimer = window.setTimeout(updateUprightTester, Math.max(100, interval));
}

async function startUprightTester() {
  uprightTestActive = true;
  uprightTestButtonEl.textContent = "Stop upright test";
  setUprightTesterStatus("Checking...");
  await requestMotionAccess();

  if (uprightTestActive) {
    updateUprightTester();
  }
}

function toggleUprightTester() {
  if (uprightTestActive) {
    stopUprightTester();
    return;
  }

  startUprightTester();
}

function phaseNeedsUpright() {
  if (!shouldCheckUpright()) {
    return false;
  }

  return (
    state.phase === "riding" &&
    !state.seated &&
    !state.breakdownActive &&
    !state.seatOfferActive
  );
}

function countdownCanMove(now) {
  return !phaseNeedsUpright() || isPhoneUpright(now);
}

async function requestMotionAccess() {
  if (!shouldCheckUpright()) {
    state.usingSimulatedMotion = false;
    state.motionPermission = "not-needed";
    return;
  }

  if (!canUseRealMotion()) {
    state.usingSimulatedMotion = true;
    state.motionPermission = "fallback";
    return;
  }

  const eventConstructor = window.DeviceOrientationEvent;

  if (typeof eventConstructor.requestPermission === "function") {
    try {
      const response = await eventConstructor.requestPermission();
      state.motionPermission = response;
      if (response !== "granted") {
        state.usingSimulatedMotion = true;
      }
    } catch {
      state.motionPermission = "denied";
      state.usingSimulatedMotion = true;
    }
  } else {
    state.motionPermission = "granted";
  }
}

async function requestStepMotionAccess() {
  if (!canUseStepMotion()) {
    state.stepMotionPermission = "fallback";
    return;
  }

  const eventConstructor = window.DeviceMotionEvent;

  if (typeof eventConstructor.requestPermission === "function") {
    try {
      state.stepMotionPermission = await eventConstructor.requestPermission();
    } catch {
      state.stepMotionPermission = "denied";
    }
    return;
  }

  state.stepMotionPermission = "granted";
}

function handleOrientation(event) {
  state.orientation.beta = event.beta;
  state.orientation.gamma = event.gamma;
  state.orientation.seenAt = performance.now();

  if (state.motionPermission === "unknown") {
    state.motionPermission = "granted";
  }
}

function readMotionMagnitude(event) {
  const acceleration = event.accelerationIncludingGravity ?? event.acceleration;

  if (!acceleration) {
    return null;
  }

  const x = Number(acceleration.x);
  const y = Number(acceleration.y);
  const z = Number(acceleration.z);

  if (![x, y, z].every(Number.isFinite)) {
    return null;
  }

  return Math.sqrt(x * x + y * y + z * z);
}

function handleDeviceMotion(event) {
  const now = performance.now();
  state.lastStepMotionAt = now;

  if (state.stepMotionPermission === "unknown") {
    state.stepMotionPermission = "granted";
  }

  if (!state.breakdownActive) {
    return;
  }

  const magnitude = readMotionMagnitude(event);

  if (magnitude === null) {
    return;
  }

  if (magnitude <= getBreakdownMotionResetThreshold()) {
    state.stepMotionPeakActive = false;
    return;
  }

  if (
    magnitude >= getBreakdownMotionThreshold() &&
    !state.stepMotionPeakActive &&
    now - state.lastStepAt >= getBreakdownMinStepInterval()
  ) {
    state.stepMotionPeakActive = true;
    state.lastStepAt = now;
    addBreakdownSteps(1);
  }
}

function stopAllAudio(immediate = false) {
  clearStartSound(immediate);
  clearEndSound(immediate);
  clearAuntieSound(immediate);
  clearTrainBreakdownSound(immediate);
  clearTrainDelaySound(immediate);
  trainSoundscape.stop(immediate);
  tunnelNoisePlayer.stop(immediate);
  stationAnnouncementPlayer.stop(immediate);
  doorClosingPlayer.stop(immediate);
}

function canDemoSkip() {
  return (
    DEMO_SKIP_ENABLED &&
    !state.showingSettings &&
    state.phase !== "idle" &&
    state.phase !== "arrived"
  );
}

function getNextStationElapsed() {
  const stationSegment = getStationSegment();
  const stationDurations = getStationDurations();
  const elapsed = getRideElapsed();

  if (stationSegment.mode === "travel") {
    return elapsed + stationSegment.remaining;
  }

  if (stationSegment.mode === "dwell") {
    const nextLegDuration = stationDurations[stationSegment.legIndex + 1] ?? 0;
    return elapsed + stationSegment.remaining + nextLegDuration;
  }

  return DURATIONS.ride;
}

function skipRidingToNextStation() {
  const rideDuration = DURATIONS.ride;
  const targetElapsed = Math.min(rideDuration, getNextStationElapsed());
  state.rideRemaining = Math.max(0, rideDuration - targetElapsed);
  state.lastTick = performance.now();
  state.lastActionKey = "none:false";
  resetAuntieEvent();
  clearStationSeatOffer();
  resetTrainBreakdown();

  if (state.rideRemaining <= 0) {
    finishRide();
    return;
  }

  let stationSegment = getStationSegment();

  if (maybeStartTrainDelay(stationSegment)) {
    stationSegment = getStationSegment();
  }

  maybeStartStationSeatOffer(stationSegment);
  trainSoundscape.start(performance.now());
  render();
}

function skipToNextStation() {
  if (!canDemoSkip()) {
    return;
  }

  stopPretendSleep();
  stopAllAudio(true);
  state.lastTick = performance.now();

  if (state.phase === "waiting") {
    state.arrivalRemaining = 0;
    startBoarding();
    stopAllAudio(true);
    render();
    return;
  }

  if (state.phase === "boarding") {
    state.boardingRemaining = 0;
    startRide(state.seatProgress >= SEAT_RUSH_CONFIG.seatThreshold);
    stopAllAudio(true);
    skipRidingToNextStation();
    return;
  }

  if (state.phase === "riding") {
    skipRidingToNextStation();
  }
}

function openSettings() {
  if (state.phase !== "idle") {
    return;
  }

  populateSettingsForm();
  state.showingSettings = true;
  render();
}

function closeSettings() {
  stopSettingsPreviewAudio();
  stopUprightTester();
  state.showingSettings = false;
  render();
}

function refreshAfterSettingsChange(message) {
  applyCurrentGameSettings();
  state.lastActionKey = "none:false";
  populateSettingsForm();
  showStatusText(message, "success");
  render();
}

function saveSettings(event) {
  event.preventDefault();

  if (
    typeof settingsFormEl.reportValidity === "function" &&
    !settingsFormEl.reportValidity()
  ) {
    return;
  }

  stopSettingsPreviewAudio();
  USER_GAME_SETTINGS = readSettingsForm();
  saveStoredGameSettings(USER_GAME_SETTINGS);
  refreshAfterSettingsChange("Settings saved.");
}

function resetSettingsToConfig() {
  stopSettingsPreviewAudio();
  USER_GAME_SETTINGS = {};
  clearStoredGameSettings();
  refreshAfterSettingsChange("Settings reset.");
}

function resetState() {
  hideStatusText(true);
  clearStartSound();
  clearEndSound();
  clearAuntieSound();
  clearTrainBreakdownSound();
  clearTrainDelaySound();
  trainSoundscape.stop();
  tunnelNoisePlayer.stop();
  stationAnnouncementPlayer.stop();
  doorClosingPlayer.stop();
  state.phase = "idle";
  state.showingSettings = false;
  state.lastTick = 0;
  clearDwellDelayExtensions();
  resetCountdowns();
  state.seatProgress = 0;
  clearStationSeatOffer();
  state.seated = false;
  state.nextStationAnnouncementsPlayed = new Set();
  state.arrivingAnnouncementsPlayed = new Set();
  state.doorClosingAnnouncementsPlayed = new Set();
  state.breakdownSegmentsChecked = new Set();
  state.trainDelayStationsChecked = new Set();
  state.seatOfferStationsChecked = new Set();
  state.auntieDeparturesChecked = new Set();
  resetTrainBreakdown();
  resetAuntieEvent();
  state.lastActionKey = "none:false";
  state.simulatedUpright = true;
  state.uprightCheck.checkedAt = Number.NEGATIVE_INFINITY;
  state.uprightCheck.upright = true;
  render();
}

function startWaiting() {
  hideStatusText(true);
  clearEndSound();
  clearAuntieSound();
  clearTrainBreakdownSound();
  clearTrainDelaySound();
  trainSoundscape.stop();
  tunnelNoisePlayer.stop();
  stationAnnouncementPlayer.stop();
  doorClosingPlayer.stop();
  state.phase = "waiting";
  state.showingSettings = false;
  state.lastTick = performance.now();
  clearDwellDelayExtensions();
  resetCountdowns();
  state.seatProgress = 0;
  clearStationSeatOffer();
  state.seated = false;
  state.nextStationAnnouncementsPlayed = new Set();
  state.arrivingAnnouncementsPlayed = new Set();
  state.doorClosingAnnouncementsPlayed = new Set();
  state.breakdownSegmentsChecked = new Set();
  state.trainDelayStationsChecked = new Set();
  state.seatOfferStationsChecked = new Set();
  state.auntieDeparturesChecked = new Set();
  resetTrainBreakdown();
  resetAuntieEvent();
  state.lastActionKey = "none:false";
  state.uprightCheck.checkedAt = Number.NEGATIVE_INFINITY;
  state.uprightCheck.upright = true;
  requestAnimationFrame(tick);
  render();
}

function startBoarding() {
  state.phase = "boarding";
  state.boardingRemaining = DURATIONS.boarding;
  state.seatProgress = 0;
  clearStationSeatOffer();
  vibrate(VIBRATION_CONFIG.boardingStart);
  render();
}

function startRide(seated) {
  state.phase = "riding";
  state.seated = seated;
  clearDwellDelayExtensions();
  state.rideRemaining = DURATIONS.ride;
  state.nextStationAnnouncementsPlayed = new Set();
  state.arrivingAnnouncementsPlayed = new Set();
  state.doorClosingAnnouncementsPlayed = new Set();
  state.breakdownSegmentsChecked = new Set();
  state.trainDelayStationsChecked = new Set();
  state.seatOfferStationsChecked = new Set();
  clearStationSeatOffer();
  state.auntieDeparturesChecked = new Set();
  resetTrainBreakdown();
  resetAuntieEvent();
  const stationSegment = getStationSegment();

  if (!maybeStartTrainBreakdown(stationSegment)) {
    playDueNextStationAnnouncement();
    trainSoundscape.start();
    vibrate(seated ? VIBRATION_CONFIG.seated : VIBRATION_CONFIG.standing);
    showStatusText(
      seated ? "Seat secured!" : "Failed to get a seat! Standing it shall be...",
      seated ? "success" : "danger",
    );
  }

  render();
}

function finishRide() {
  hideStatusText(true);
  resetAuntieEvent();
  clearStationSeatOffer();
  clearAuntieSound();
  clearTrainBreakdownSound();
  clearTrainDelaySound();
  trainSoundscape.stop();
  tunnelNoisePlayer.stop();
  state.phase = "arrived";
  state.rideRemaining = 0;
  vibrate(VIBRATION_CONFIG.arrival);
  playEndSound();
  render();
}

function rush() {
  const action = getActionState(performance.now());

  if (action.type !== "rush" || !action.enabled) {
    return;
  }

  state.seatProgress = clamp(state.seatProgress + SEAT_RUSH_CONFIG.gainPerPress, 0, 1);
  queueEl.classList.add("rushing");
  window.setTimeout(() => queueEl.classList.remove("rushing"), 120);
  triggerRushShake();
  vibrate(VIBRATION_CONFIG.rushTap);

  render();
}

function vibrate(pattern) {
  if ("vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}

function playDueArrivingAnnouncement() {
  if (state.phase !== "riding") {
    return;
  }

  const stationSegment = getStationSegment();

  if (stationSegment.mode !== "travel") {
    return;
  }

  const leadTime = getArrivingLeadTime();

  if (stationSegment.remaining > leadTime) {
    return;
  }

  const key = getStationAnnouncementKey(
    stationSegment.next,
    "arriving",
    stationSegment.legIndex,
  );

  if (state.arrivingAnnouncementsPlayed.has(key)) {
    return;
  }

  state.arrivingAnnouncementsPlayed.add(key);
  stationAnnouncementPlayer.playArrivingAtStation(stationSegment.next);
}

function playDueNextStationAnnouncement() {
  if (state.phase !== "riding") {
    return;
  }

  const stationSegment = getStationSegment();

  if (stationSegment.mode !== "travel") {
    return;
  }

  const key = getStationAnnouncementKey(
    stationSegment.next,
    "next",
    stationSegment.legIndex,
  );

  if (state.nextStationAnnouncementsPlayed.has(key)) {
    return;
  }

  state.nextStationAnnouncementsPlayed.add(key);
  stationAnnouncementPlayer.playNextStation(stationSegment.next);
  maybeStartAuntieEvent(stationSegment);
}

function playDueDoorClosingSound() {
  const leadTime = getDoorClosingLeadTime();
  let key = "";

  if (state.phase === "boarding") {
    if (state.boardingRemaining > leadTime) {
      return;
    }

    key = getStationAnnouncementKey(getOriginStation(), "doors", "boarding");
  } else if (state.phase === "riding") {
    const stationSegment = getStationSegment();

    if (stationSegment.mode !== "dwell" || stationSegment.remaining > leadTime) {
      return;
    }

    key = getStationAnnouncementKey(stationSegment.current, "doors", stationSegment.legIndex);
  } else {
    return;
  }

  if (state.doorClosingAnnouncementsPlayed.has(key)) {
    return;
  }

  state.doorClosingAnnouncementsPlayed.add(key);
  doorClosingPlayer.play();
}

function tick(now) {
  if (state.phase === "idle" || state.phase === "arrived") {
    return;
  }

  const elapsed = Math.min(250, now - state.lastTick);
  state.lastTick = now;

  const canMove = countdownCanMove(now);

  if (canMove) {
    if (state.phase === "waiting") {
      state.arrivalRemaining -= elapsed;

      if (state.arrivalRemaining <= 0) {
        state.arrivalRemaining = 0;
        startBoarding();
      }
    } else if (state.phase === "boarding") {
      state.boardingRemaining -= elapsed;
      state.seatProgress = clamp(
        state.seatProgress - SEAT_RUSH_CONFIG.decayPerSecond * (elapsed / 1000),
        0,
        1,
      );
      playDueDoorClosingSound();

      if (state.boardingRemaining <= 0) {
        state.boardingRemaining = 0;
        startRide(state.seatProgress >= SEAT_RUSH_CONFIG.seatThreshold);
      }
    } else if (state.phase === "riding") {
      if (state.breakdownActive) {
        // Walking progress replaces train movement during a breakdown.
      } else {
        state.rideRemaining -= elapsed;
        let stationSegment = getStationSegment();

        if (maybeStartTrainBreakdown(stationSegment)) {
          stationSegment = getStationSegment();
        }

        if (!state.breakdownActive) {
          playDueNextStationAnnouncement();

          if (maybeStartTrainDelay(stationSegment)) {
            stationSegment = getStationSegment();
          }

          maybeStartStationSeatOffer(stationSegment);
          updateStationSeatOffer(elapsed, stationSegment);
          playDueArrivingAnnouncement();
          playDueDoorClosingSound();
          updateAuntieEvent(elapsed);

          if (state.rideRemaining <= 0) {
            finishRide();
          }
        }
      }
    }
  }

  const currentSegment = state.phase === "riding" ? getStationSegment() : null;
  const cabinAudioCanPlay = state.phase === "riding" && !state.breakdownActive;
  const tunnelNoiseCanPlay = cabinAudioCanPlay && currentSegment?.mode === "travel";
  trainSoundscape.tick(now, cabinAudioCanPlay);
  tunnelNoisePlayer.tick(tunnelNoiseCanPlay, currentSegment?.remaining);
  render();
  requestAnimationFrame(tick);
}

function render() {
  const now = performance.now();
  const upright = isPhoneUpright(now);
  const paused = phaseNeedsUpright() && !upright;
  const usesUprightCheck = shouldCheckUpright();
  const needsMotionFallback =
    usesUprightCheck &&
    (state.usingSimulatedMotion ||
      !canUseRealMotion() ||
      (state.phase !== "idle" &&
        state.motionPermission === "granted" &&
        !realMotionIsFresh(now)));

  startScreenEl.hidden = state.phase !== "idle" || state.showingSettings;
  settingsScreenEl.hidden = !state.showingSettings;
  playScreenEl.hidden =
    state.showingSettings || state.phase === "idle" || state.phase === "arrived";
  successScreenEl.hidden = state.showingSettings || state.phase !== "arrived";
  deviceIndicatorEl.hidden = state.showingSettings;
  gameEl.classList.toggle("paused", paused);
  uprightOverlayEl.hidden = !paused;
  document.body.classList.toggle("arrival-pulse", state.phase === "boarding");
  trainEl.classList.toggle(
    "approaching",
    state.phase === "waiting" && state.arrivalRemaining <= TRAIN_SLIDE_LEAD_TIME,
  );
  trainEl.classList.toggle("arrived", state.phase !== "idle" && state.arrivalRemaining <= 0);
  trainEl.classList.toggle("boarding", state.phase === "boarding");
  sceneEl.classList.toggle("doors-open", state.phase === "boarding");
  queueEl.classList.toggle("hidden", state.phase === "riding" || state.phase === "arrived");
  trainInteriorEl.hidden = state.phase !== "riding" && state.phase !== "arrived";
  statusRibbonEl.classList.remove("success", "danger");

  sensorFallbackEl.hidden = !needsMotionFallback;
  sensorFallbackEl.textContent = state.simulatedUpright ? "Simulated upright" : "Simulated tilted";

  renderDeviceIndicator();
  renderRouteCopy();
  renderSceneStationSign();
  renderSuccessScreen();
  renderStationSegment();
  renderAuntieEvent();
  renderDemoSkip();
  renderChangelogBadge();
  renderPhaseCopy(paused, upright);
  renderTimers();
  renderActions();
}

function renderDeviceIndicator() {
  const desktopMode = isLikelyComputer();
  deviceIndicatorEl.textContent = desktopMode ? "desktop_windows" : "smartphone";
  deviceIndicatorEl.setAttribute("aria-label", desktopMode ? "Desktop device" : "Mobile device");
  deviceIndicatorEl.removeAttribute("title");
}

function renderRouteCopy() {
  const destination = getDestinationStation();

  routeTitleEl.textContent = `Train to ${destination.name}`;
  routeSubtitleEl.innerHTML = MAIN_SUBTITLE_HTML;
  successHeadingEl.textContent = `You Survived Train to ${destination.name}!`;
  successStationCodeEl.textContent = destination.code;
}

function getSceneStation() {
  if (state.phase === "riding" || state.phase === "arrived") {
    return getStationSegment().current;
  }

  return getOriginStation();
}

function renderSceneStationSign() {
  const station = getSceneStation();
  stationSignCodeEl.textContent = station.code;
  stationSignNameEl.textContent = station.name;
}

function renderSuccessScreen() {
  if (state.phase !== "arrived") {
    return;
  }

  const destination = getDestinationStation();
  successMessageEl.textContent = `You made it to ${destination.name}!`;
}

function renderStationSegment() {
  const stationSegment = getStationSegment();
  currentStationNameEl.textContent = stationSegment.current.name;
  nextStationNameEl.textContent = stationSegment.next.name;
  const progress = state.breakdownActive ? getBreakdownRouteProgress() : stationSegment.progress;
  segmentProgressEl.style.width = `${Math.round(progress * 100)}%`;
}

function getRideStatusText() {
  const stationSegment = getStationSegment();

  if (stationSegment.mode === "dwell") {
    return `Currently stopping at ${stationSegment.current.name}`;
  }

  return `Going from ${stationSegment.current.name} to ${stationSegment.next.name}`;
}

function renderAuntieEvent() {
  const auntieDangerLevel = getAuntieVignetteLevel();
  const auntieShakeDistance = Math.round((1 + auntieDangerLevel * 6) * 100) / 100;
  auntieVignetteEl.style.opacity = auntieDangerLevel.toFixed(3);
  gameEl.style.setProperty("--auntie-shake-x", `${auntieShakeDistance}px`);
  gameEl.style.setProperty("--auntie-shake-y", `${Math.max(1, auntieShakeDistance * 0.58)}px`);
  gameEl.style.setProperty("--auntie-shake-x-neg", `${-auntieShakeDistance}px`);
  gameEl.style.setProperty("--auntie-shake-y-neg", `${-Math.max(1, auntieShakeDistance * 0.58)}px`);
  gameEl.classList.toggle("auntie-shake", auntieDangerLevel > 0);
  sleepDimEl.style.opacity = state.auntieDimLevel.toFixed(3);
  auntieImageEl.src = getAuntieImageSrc();
  auntieEventEl.style.setProperty(
    "--auntie-slide-duration",
    `${Math.round(getAuntieSlideDuration())}ms`,
  );
  auntieEventEl.classList.toggle("from-left", state.auntieSide !== "right");
  auntieEventEl.classList.toggle("from-right", state.auntieSide === "right");

  if (!state.auntieActive) {
    auntieEventEl.classList.remove("visible");
    auntieEventEl.hidden = true;
    return;
  }

  const wasHidden = auntieEventEl.hidden;
  auntieEventEl.hidden = false;

  if (wasHidden) {
    auntieEventEl.classList.remove("visible");
    window.requestAnimationFrame(() => {
      if (state.auntieActive) {
        auntieEventEl.classList.add("visible");
      }
    });
    return;
  }

  auntieEventEl.classList.add("visible");
}

function renderDemoSkip() {
  skipButtonEl.hidden = !DEMO_SKIP_ENABLED || state.showingSettings;
  skipButtonEl.disabled = !canDemoSkip();
}

function renderChangelogBadge() {
  if (!changelogBadgeEl) {
    return;
  }

  changelogBadgeEl.hidden = !hasNewChangelogEntries();
}

function renderPhaseCopy(paused, upright) {
  const usesUprightCheck = shouldCheckUpright();
  const origin = getOriginStation();
  const destination = getDestinationStation();

  if (state.phase === "idle") {
    statusRibbonEl.textContent = "Platform queue forming";
    messageEl.textContent = "Tap start when you are at the platform.";
    return;
  }

  if (paused) {
    statusRibbonEl.textContent = "Timer paused";
    messageEl.textContent = "Phone is not being held upright!";
    return;
  }

  if (state.phase === "waiting") {
    statusRibbonEl.textContent = `Train approaching ${origin.name}`;
    messageEl.textContent = "Wait in the queue until the train arrives.";
    return;
  }

  if (state.phase === "boarding") {
    statusRibbonEl.textContent = "Doors open";
    messageEl.textContent = "Keep the seat meter above 95% before the doors close!";
    return;
  }

  if (state.phase === "riding" && state.breakdownActive) {
    const destination = state.breakdownDestination ?? getStationSegment().next;
    statusRibbonEl.classList.add("danger");
    statusRibbonEl.textContent = "Train breakdown";
    messageEl.textContent = `Walk to ${destination.name}.`;
    return;
  }

  if (state.phase === "riding" && !state.seated && state.seatOfferActive) {
    const stationSegment = getStationSegment();
    statusRibbonEl.classList.add("success");
    statusRibbonEl.textContent = `Seat available at ${stationSegment.current.name}`;
    messageEl.textContent = "Snatch your seat before someone else sits down!";
    return;
  }

  if (state.phase === "riding" && state.seated && state.auntieActive) {
    statusRibbonEl.textContent = "Auntie wants your seat";
    messageEl.textContent = "Press and hold the button until auntie goes away!";
    return;
  }

  if (state.phase === "riding" && state.seated) {
    statusRibbonEl.textContent = getRideStatusText();
    messageEl.textContent = "You can rest the phone while the ride continues.";
    return;
  }

  if (state.phase === "riding") {
    statusRibbonEl.textContent = getRideStatusText();
    messageEl.textContent = usesUprightCheck
      ? "Keep the phone upright until a seat is available."
      : "Ride it out standing until a seat becomes available.";
    return;
  }

  statusRibbonEl.textContent = `Arrived at ${destination.name} station`;
  messageEl.textContent = state.seated
    ? `You made it to ${destination.name} station with a seat.`
    : `You made it to ${destination.name} station standing.`;
}

function renderTimers() {
  metersEl.hidden = true;
  primaryMeterEl.hidden = true;
  metersEl.classList.add("single");
}

function getActionState(now = performance.now()) {
  if (state.phase === "boarding") {
    return {
      enabled: countdownCanMove(now),
      label: `SNATCH SEAT!!! ${formatTime(state.boardingRemaining)}`,
      type: "rush",
    };
  }

  if (state.phase === "riding" && !state.seated && state.seatOfferActive) {
    return {
      enabled: countdownCanMove(now),
      label: `SNATCH SEAT!!! ${formatTime(state.seatOfferRemaining)}`,
      type: "rush",
    };
  }

  if (state.phase === "riding" && state.breakdownActive) {
    return {
      enabled: true,
      label: `WALK ${state.breakdownSteps}/${state.breakdownTargetSteps}`,
      type: "walk",
    };
  }

  if (state.phase === "riding" && state.seated && state.auntieActive) {
    return {
      enabled: true,
      label: "Pretend to sleep",
      type: "sleep",
    };
  }

  if (
    state.phase === "riding" &&
    (stationAnnouncementPlayer.blocked ||
      doorClosingPlayer.blocked ||
      (trainSoundscape.blocked && trainSoundscape.hasSounds()) ||
      tunnelNoisePlayer.blocked)
  ) {
    return {
      enabled: true,
      label: "Enable sound",
      type: "sound",
    };
  }

  if (state.phase === "arrived") {
    return {
      enabled: true,
      label: "Play again",
      type: "reset",
    };
  }

  if (phaseNeedsUpright() && !countdownCanMove(now)) {
    return {
      enabled: false,
      label: "Hold phone upright",
      type: "none",
    };
  }

  if (state.phase === "waiting") {
    return {
      enabled: false,
      label: formatTime(state.arrivalRemaining),
      type: "none",
    };
  }

  if (state.phase === "riding") {
    const stationSegment = getStationSegment();

    return {
      enabled: false,
      label: formatTime(stationSegment.remaining),
      type: "none",
    };
  }

  return {
    enabled: false,
    label: "Waiting",
    type: "none",
  };
}

function triggerAction() {
  const action = getActionState();

  if (!action.enabled) {
    return;
  }

  if (action.type === "rush") {
    if (doorClosingPlayer.blocked) {
      doorClosingPlayer.enableFromGesture();
    }

    rush();
  } else if (action.type === "walk") {
    addBreakdownSteps(getBreakdownManualStepsPerPress());
  } else if (action.type === "sound") {
    stationAnnouncementPlayer.enableFromGesture();
    doorClosingPlayer.enableFromGesture();
    trainSoundscape.enableFromGesture();
    tunnelNoisePlayer.enableFromGesture();
  } else if (action.type === "reset") {
    resetState();
  }
}

function renderActions() {
  const action = getActionState();
  const actionKey = `${action.type}:${action.enabled}`;
  const actionJustActivated = action.enabled && actionKey !== state.lastActionKey;

  if (actionJustActivated) {
    vibrate(VIBRATION_CONFIG.actionActivation);
  }

  state.lastActionKey = actionKey;
  startButtonEl.hidden = state.phase !== "idle";
  actionButtonEl.textContent = action.label;
  actionButtonEl.disabled = !action.enabled;
  actionButtonEl.dataset.action = action.type;
  actionButtonEl.style.setProperty("--seat-progress-ratio", state.seatProgress.toFixed(3));
  actionButtonEl.classList.toggle(
    "seat-ready",
    action.type === "rush" && state.seatProgress >= SEAT_RUSH_CONFIG.seatThreshold,
  );
}

startButtonEl.addEventListener("click", async () => {
  markCurrentGameVersionPlayed();
  playStartSound();
  unlockAuntieSound();
  unlockTrainBreakdownSound();
  unlockTrainDelaySound();
  stationAnnouncementPlayer.unlock();
  doorClosingPlayer.unlock();
  trainSoundscape.unlock();
  tunnelNoisePlayer.unlock();
  await Promise.all([requestMotionAccess(), requestStepMotionAccess()]);
  startWaiting();
});

settingsButtonEl.addEventListener("click", openSettings);
settingsBackButtonEl.addEventListener("click", closeSettings);
settingsFormEl.addEventListener("submit", saveSettings);
settingsResetButtonEl.addEventListener("click", resetSettingsToConfig);
uprightTestButtonEl.addEventListener("click", toggleUprightTester);
getSettingInput("timing.durationBetweenStations")?.addEventListener(
  "change",
  handleBetweenStationsChange,
);

settingsFormEl.addEventListener("click", (event) => {
  const previewButton = event.target.closest("[data-preview-sound]");

  if (!previewButton) {
    return;
  }

  playSettingsAudioPreview(previewButton.dataset.previewSound, previewButton);
});

actionButtonEl.addEventListener("click", triggerAction);

actionButtonEl.addEventListener("pointerdown", (event) => {
  if (!isSleepActionActive()) {
    return;
  }

  event.preventDefault();
  sleepPointerId = event.pointerId;
  startPretendSleep();

  if (typeof actionButtonEl.setPointerCapture === "function") {
    actionButtonEl.setPointerCapture(sleepPointerId);
  }
});

actionButtonEl.addEventListener("lostpointercapture", endPretendSleepPress);

actionButtonEl.addEventListener("contextmenu", (event) => {
  if (!state.auntieSleeping && !isSleepActionActive()) {
    return;
  }

  event.preventDefault();
  endPretendSleepPress();
});

actionButtonEl.addEventListener("selectstart", (event) => {
  event.preventDefault();
});

window.addEventListener("pointerup", endPretendSleepPress);
window.addEventListener("pointercancel", endPretendSleepPress);
window.addEventListener("touchend", endPretendSleepPress);
window.addEventListener("touchcancel", endPretendSleepPress);
window.addEventListener("mouseup", endPretendSleepPress);
window.addEventListener("blur", endPretendSleepPress);

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    endPretendSleepPress();
  }
});

successRestartButtonEl.addEventListener("click", resetState);

skipButtonEl.addEventListener("click", skipToNextStation);

sensorFallbackEl.addEventListener("click", () => {
  state.usingSimulatedMotion = true;
  state.simulatedUpright = !state.simulatedUpright;
  render();
});

window.addEventListener("deviceorientation", handleOrientation);
window.addEventListener("devicemotion", handleDeviceMotion);

window.addEventListener("keydown", (event) => {
  if (event.key.toLowerCase() === "u") {
    state.usingSimulatedMotion = true;
    state.simulatedUpright = !state.simulatedUpright;
    render();
  }

  if (event.code === "Space") {
    event.preventDefault();
    if (isSleepActionActive()) {
      if (!event.repeat) {
        startPretendSleep();
      }
      return;
    }

    triggerAction();
  }
});

window.addEventListener("keyup", (event) => {
  if (event.code === "Space") {
    stopPretendSleep();
  }
});

async function initializeGame() {
  preloadImages(PRELOAD_IMAGE_PATHS);
  await loadGameSettings();
  resetCountdowns();
  render();
}

initializeGame();
