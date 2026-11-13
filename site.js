"use strict";

document.querySelectorAll(".example").forEach((example) => {
  const videos = [...example.querySelectorAll("video")];
  const playButton = example.querySelector("[data-action='play']");
  const replayButton = example.querySelector("[data-action='replay']");
  const status = example.querySelector(".playback-status");
  const playLabel = videos.length === 2 ? "Play both" : "Play all";
  const pauseLabel = videos.length === 2 ? "Pause both" : "Pause all";
  let busy = false;

  function updateButton() {
    const playing = videos.some((video) => !video.paused && !video.ended);
    playButton.textContent = playing ? pauseLabel : playLabel;
    playButton.setAttribute("aria-pressed", String(playing));
  }

  function pause() {
    videos.forEach((video) => video.pause());
    updateButton();
  }

  function ready(video) {
    if (video.error) return Promise.reject(new Error("Video unavailable"));
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => finish(new Error("Video load timed out")), 20000);
      function finish(error) {
        clearTimeout(timer);
        video.removeEventListener("loadeddata", loaded);
        video.removeEventListener("error", failed);
        error ? reject(error) : resolve();
      }
      function loaded() { finish(); }
      function failed() { finish(new Error("Video unavailable")); }
      video.addEventListener("loadeddata", loaded, { once: true });
      video.addEventListener("error", failed, { once: true });
      video.preload = "auto";
      video.load();
    });
  }

  async function play(restart = false) {
    if (busy) return;
    busy = true;
    playButton.disabled = true;
    replayButton.disabled = true;
    status.textContent = "";
    try {
      document.querySelectorAll(".example").forEach((other) => {
        if (other !== example) other.querySelectorAll("video").forEach((video) => video.pause());
      });
      await Promise.all(videos.map(ready));
      const time = restart || videos.some((video) => video.ended) ? 0 : Math.min(...videos.map((video) => video.currentTime));
      videos.forEach((video) => { video.currentTime = time; });
      const outcomes = await Promise.allSettled(videos.map((video) => video.play()));
      if (outcomes.some((outcome) => outcome.status === "rejected")) {
        pause();
        status.textContent = "Use each video’s play control to start playback.";
      }
    } catch (_) {
      pause();
      status.textContent = "This video could not be loaded. Please try its individual play control or reload the page.";
    } finally {
      busy = false;
      playButton.disabled = false;
      replayButton.disabled = false;
      updateButton();
    }
  }

  playButton.addEventListener("click", () => {
    if (videos.some((video) => !video.paused && !video.ended)) pause();
    else play();
  });
  replayButton.addEventListener("click", () => play(true));
  videos.forEach((video) => {
    ["play", "pause", "ended"].forEach((event) => video.addEventListener(event, updateButton));
  });
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) document.querySelectorAll("video").forEach((video) => video.pause());
});
