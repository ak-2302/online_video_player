const video = document.getElementById("video");
const fileInput = document.getElementById("fileInput");
const dropZone = document.getElementById("dropZone");
const statusEl = document.getElementById("status");
const playlistEl = document.getElementById("playlist");
const prevButton = document.getElementById("prevButton");
const nextButton = document.getElementById("nextButton");
const modeButton = document.getElementById("modeButton");
const rateSelect = document.getElementById("rateSelect");

const modes = [
  { id: "auto", label: "連続再生" },
  { id: "loop", label: "単体ループ" },
  { id: "stop", label: "終了で停止" }
];

let files = [];
let currentIndex = -1;
let currentUrl = "";
let modeIndex = 0;
const dragEvents = ["dragover", "drop"];

const isVideoFile = (file) => {
  return file.type.startsWith("video/") || /\.(mp4|webm|ogg|ogv|mov|m4v)$/i.test(file.name);
};

const updateStatus = (message, isError = false) => {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const hasPlayableVideo = () => currentIndex >= 0 && Number.isFinite(video.duration);

const releaseCurrentUrl = () => {
  if (!currentUrl) return;
  URL.revokeObjectURL(currentUrl);
  currentUrl = "";
};

const updateMode = () => {
  const mode = modes[modeIndex];
  video.loop = mode.id === "loop";
  modeButton.textContent = mode.label;
};

const updateRate = () => {
  rateSelect.value = String(video.playbackRate);
};

const resetLibraryState = (message = "動画ファイルを選択してください。", isError = false) => {
  releaseCurrentUrl();
  files = [];
  currentIndex = -1;
  video.removeAttribute("src");
  video.load();
  renderPlaylist();
  updateStatus(message, isError);
};

const renderPlaylist = () => {
  playlistEl.textContent = "";
  const fragment = document.createDocumentFragment();

  files.forEach((file, index) => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = `track${index === currentIndex ? " active" : ""}`;
    button.textContent = file.name;
    button.addEventListener("click", () => loadVideo(index, true));
    item.appendChild(button);
    fragment.appendChild(item);
  });

  playlistEl.appendChild(fragment);
};

const loadVideo = async (index, shouldPlay) => {
  const file = files[index];
  if (!file) return;

  currentIndex = index;
  releaseCurrentUrl();
  currentUrl = URL.createObjectURL(file);
  video.src = currentUrl;
  video.load();
  updateMode();
  renderPlaylist();
  updateStatus(`読み込み: ${file.name}`);

  if (!shouldPlay) return;

  try {
    await video.play();
  } catch {
    updateStatus("再生を開始できませんでした。再生ボタンを押してください。", true);
  }
};

const setFiles = (fileList) => {
  const nextFiles = Array.from(fileList).filter(isVideoFile);

  if (nextFiles.length === 0) {
    resetLibraryState("未対応形式です。動画ファイルを選択してください。", true);
    return;
  }

  files = nextFiles;
  currentIndex = -1;
  loadVideo(0, false);
  updateStatus(`${files.length}件の動画を読み込みました。`);
};

const togglePlay = async () => {
  if (currentIndex < 0) return;

  if (!video.paused) {
    video.pause();
    return;
  }

  try {
    await video.play();
  } catch {
    updateStatus("再生を開始できませんでした。再生ボタンを押してください。", true);
  }
};

const moveTrack = (step) => {
  if (files.length === 0) return;
  const nextIndex = (currentIndex + step + files.length) % files.length;
  loadVideo(nextIndex, true);
};

const seekBy = (seconds) => {
  if (!hasPlayableVideo()) return;
  video.currentTime = clamp(video.currentTime + seconds, 0, video.duration);
};

const seekPercent = (percent) => {
  if (!hasPlayableVideo()) return;
  video.currentTime = clamp(video.duration * percent, 0, video.duration);
};

const changeVolume = (step) => {
  video.volume = clamp(video.volume + step, 0, 1);
  if (video.volume > 0) video.muted = false;
};

const changeRate = (step) => {
  const nextRate = Math.round(clamp(video.playbackRate + step, 0.25, 2) * 100) / 100;
  video.playbackRate = nextRate;
  updateRate();
};

const toggleFullscreen = async () => {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      const target = video.requestFullscreen ? video : document.documentElement;
      await target.requestFullscreen();
    }
  } catch {
    updateStatus("全画面表示に切り替えできませんでした。", true);
  }
};

const cycleMode = () => {
  modeIndex = (modeIndex + 1) % modes.length;
  updateMode();
  updateStatus(`再生モード: ${modes[modeIndex].label}`);
};

fileInput.addEventListener("change", () => {
  setFiles(fileInput.files);
  fileInput.value = "";
});

prevButton.addEventListener("click", () => moveTrack(-1));
nextButton.addEventListener("click", () => moveTrack(1));
modeButton.addEventListener("click", cycleMode);
rateSelect.addEventListener("change", () => {
  video.playbackRate = Number(rateSelect.value);
});

dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropZone.classList.add("dragging");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragging");
});

dropZone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropZone.classList.remove("dragging");
  setFiles(event.dataTransfer.files);
});

dragEvents.forEach((type) => {
  document.addEventListener(type, (event) => {
    event.preventDefault();
  });
});

video.addEventListener("loadedmetadata", () => {
  updateStatus(`再生準備完了: ${files[currentIndex]?.name || ""}`);
});

video.addEventListener("ended", () => {
  const mode = modes[modeIndex].id;
  if (mode === "auto" && currentIndex < files.length - 1) {
    loadVideo(currentIndex + 1, true);
    return;
  }
  updateStatus("再生が終了しました。");
});

video.addEventListener("error", () => {
  updateStatus("動画を再生できません。未対応形式または読み込み失敗の可能性があります。", true);
});

fileInput.addEventListener("click", () => {
  fileInput.value = "";
});

document.addEventListener("keydown", async (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const key = event.key;
  const lowerKey = key.toLowerCase();

  if (key === "Escape" && document.fullscreenElement) {
    event.preventDefault();
    await document.exitFullscreen();
    return;
  }

  if (event.target instanceof Element && event.target.closest("input, select, textarea, button")) return;

  if (key === " " || lowerKey === "k" || lowerKey === "o") {
    event.preventDefault();
    await togglePlay();
  } else if (key === "ArrowLeft") {
    event.preventDefault();
    seekBy(-5);
  } else if (key === "ArrowRight") {
    event.preventDefault();
    seekBy(5);
  } else if (lowerKey === "p") {
    event.preventDefault();
    if (hasPlayableVideo()) seekBy(-video.duration * 0.01);
  } else if (lowerKey === "i") {
    event.preventDefault();
    if (hasPlayableVideo()) seekBy(video.duration * 0.01);
  } else if (lowerKey === "j") {
    event.preventDefault();
    seekBy(-10);
  } else if (lowerKey === "l") {
    event.preventDefault();
    seekBy(10);
  } else if (key === "ArrowUp") {
    event.preventDefault();
    changeVolume(0.05);
  } else if (key === "ArrowDown") {
    event.preventDefault();
    changeVolume(-0.05);
  } else if (lowerKey === "m") {
    event.preventDefault();
    video.muted = !video.muted;
  } else if (lowerKey === "f") {
    event.preventDefault();
    await toggleFullscreen();
  } else if (key === "Enter") {
    event.preventDefault();
    moveTrack(1);
  } else if (key === "Backspace") {
    event.preventDefault();
    moveTrack(-1);
  } else if (key === "[") {
    event.preventDefault();
    changeRate(-0.25);
  } else if (key === "]") {
    event.preventDefault();
    changeRate(0.25);
  } else if (/^[0-9]$/.test(key)) {
    event.preventDefault();
    seekPercent(Number(key) / 10);
  } else if (key === ".") {
    event.preventDefault();
    video.pause();
    seekBy(1 / 30);
  } else if (key === ",") {
    event.preventDefault();
    video.pause();
    seekBy(-1 / 30);
  } else if (lowerKey === "u") {
    event.preventDefault();
    cycleMode();
  }
});

updateMode();
updateRate();
