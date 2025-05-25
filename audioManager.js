// Audio Management
const AudioManager = {
  // Audio state
  speechSynthesis: window.speechSynthesis,
  currentUtterance: null,
  isPlaying: false,
  isPaused: false,
  audioProgressInterval: null,

  hasAudioScript() {
    const slide = window.slides[window.currentSlide];
    return slide && slide.audioScript;
  },

  getCurrentAudioScript() {
    const slide = window.slides[window.currentSlide];
    if (slide && slide.audioScript) {
      return slide.audioScript;
    } else {
      return `This slide doesn't have audio narration available. You can navigate to the next slide using the Next button or the right arrow key.`;
    }
  },

  updateTranscript() {
    const audioScript = this.getCurrentAudioScript();
    audioTranscriptContent.textContent = audioScript;
  },

  toggleTranscript() {
    if (audioTranscript.classList.contains("active")) {
      audioTranscript.classList.remove("active");
    } else {
      audioTranscript.classList.add("active");
    }
  },

  playAudio() {
    const audioScript = this.getCurrentAudioScript();

    if (this.isPaused && this.currentUtterance) {
      this.speechSynthesis.resume();
      this.isPaused = false;
      this.isPlaying = true;
    } else {
      this.stopAudio();
      this.currentUtterance = new SpeechSynthesisUtterance(audioScript);

      this.currentUtterance.rate = 0.9;
      this.currentUtterance.pitch = 1;
      this.currentUtterance.volume = 1;

      this.currentUtterance.onstart = () => {
        this.isPlaying = true;
        this.isPaused = false;
        this.updatePlayButton();
        this.startProgressTracking();
      };

      this.currentUtterance.onend = () => {
        this.isPlaying = false;
        this.isPaused = false;
        audioProgressFill.style.width = "100%";
        this.updatePlayButton();
        this.stopProgressTracking();
      };

      this.currentUtterance.onerror = () => {
        this.isPlaying = false;
        this.isPaused = false;
        this.updatePlayButton();
        this.stopProgressTracking();
      };

      this.speechSynthesis.speak(this.currentUtterance);
    }

    this.updatePlayButton();
  },

  pauseAudio() {
    if (this.isPlaying && !this.isPaused) {
      this.speechSynthesis.pause();
      this.isPaused = true;
      this.isPlaying = false;
      this.updatePlayButton();
      this.stopProgressTracking();
    }
  },

  stopAudio() {
    if (this.currentUtterance) {
      this.speechSynthesis.cancel();
      this.currentUtterance = null;
    }
    this.isPlaying = false;
    this.isPaused = false;
    audioProgressFill.style.width = "0%";
    this.updatePlayButton();
    this.stopProgressTracking();
  },

  restartAudio() {
    this.stopAudio();
    setTimeout(() => this.playAudio(), 100);
  },

  updatePlayButton() {
    if (this.isPlaying) {
      audioPlayIcon.setAttribute("data-lucide", "pause");
    } else {
      audioPlayIcon.setAttribute("data-lucide", "play");
    }
    lucide.createIcons();
  },

  startProgressTracking() {
    if (this.audioProgressInterval) clearInterval(this.audioProgressInterval);

    let startTime = Date.now();
    const audioScript = this.getCurrentAudioScript();
    const estimatedDuration = (audioScript.length / 12) * 1000;

    this.audioProgressInterval = setInterval(() => {
      if (this.isPlaying && !this.isPaused) {
        const elapsed = Date.now() - startTime;
        const progress = Math.min((elapsed / estimatedDuration) * 100, 100);
        audioProgressFill.style.width = progress + "%";
      }
    }, 100);
  },

  stopProgressTracking() {
    if (this.audioProgressInterval) {
      clearInterval(this.audioProgressInterval);
      this.audioProgressInterval = null;
    }
  },
};
