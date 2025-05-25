// Course Download Function
const CourseDownloader = {
  async downloadCourse() {
    try {
      // Get the current CSS content from styles.css
      const cssResponse = await fetch("styles.css");
      const cssContent = await cssResponse.text();

      // Create a simplified version of the current slides for the standalone file
      const currentSlides = window.slides.map((slide) => ({
        type: slide.type,
        data: slide.data,
        audioScript: slide.audioScript,
      }));

      // Generate the standalone JavaScript
      const standaloneJS = this.generateStandaloneJS(currentSlides);

      // Generate the HTML template
      const htmlTemplate = this.generateHTMLTemplate(cssContent, standaloneJS);

      // Create and download the file
      const blob = new Blob([htmlTemplate], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "course-presentation.html";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading course:", error);
      alert("Error downloading course. Please try again.");
    }
  },

  generateStandaloneJS(currentSlides) {
    return `// Initialize Lucide icons
lucide.createIcons();

// Course data from slides
const slides = ${JSON.stringify(currentSlides, null, 2)};

// Application state
let currentSlide = 0;
let selectedAnswers = {};
let showFeedback = {};
let flippedCards = new Set();
let activeTabs = {};

// Audio state
let speechSynthesis = window.speechSynthesis;
let currentUtterance = null;
let isPlaying = false;
let isPaused = false;
let audioProgressInterval = null;

// DOM elements
const slideContent = document.getElementById("slideContent");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const progressFill = document.getElementById("progressFill");
const progressText = document.getElementById("progressText");
const slideIndicator = document.getElementById("slideIndicator");
const modalOverlay = document.getElementById("modalOverlay");
const modalTitle = document.getElementById("modalTitle");
const modalText = document.getElementById("modalText");
const modalClose = document.getElementById("modalClose");

// Audio elements
const audioControls = document.getElementById("audioControls");
const audioPlayBtn = document.getElementById("audioPlayBtn");
const audioPlayIcon = document.getElementById("audioPlayIcon");
const audioRestartBtn = document.getElementById("audioRestartBtn");
const audioTranscriptBtn = document.getElementById("audioTranscriptBtn");
const audioProgressFill = document.getElementById("audioProgressFill");
const audioStatus = document.getElementById("audioStatus");
const audioTranscript = document.getElementById("audioTranscript");
const audioTranscriptClose = document.getElementById("audioTranscriptClose");
const audioTranscriptContent = document.getElementById("audioTranscriptContent");

${this.getSlideRenderersForStandalone()}

function renderSlide() {
  if (slides.length === 0) {
    slideContent.innerHTML = \`
      <div class="slide active" style="text-align: center; padding: 5rem 0;">
        <h2>No slides available</h2>
        <p style="color: #6b7280; margin-top: 1rem;">No content to display.</p>
      </div>
    \`;
    return;
  }

  const slide = slides[currentSlide];
  let html = "";

  switch (slide.type) {
    case "title":
      html = renderTitleSlide(slide.data);
      break;
    case "courseInfo":
      html = renderCourseInfo(slide.data);
      break;
    case "faq":
      html = renderFAQ(slide.data);
      break;
    case "textAndImage":
      html = renderTextAndImage(slide.data);
      break;
    case "textAndBullets":
      html = renderTextAndBullets(slide.data);
      break;
    case "iconsWithTitles":
      html = renderIconsWithTitles(slide.data);
      break;
    case "flipCards":
      html = renderFlipCards(slide.data);
      break;
    case "multipleChoice":
      html = renderMultipleChoice(slide.data);
      break;
    case "tabs":
      html = renderTabs(slide.data);
      break;
    case "popups":
      html = renderPopups(slide.data);
      break;
  }

  slideContent.innerHTML = html;
  lucide.createIcons();

  gsap.fromTo(
    ".slide.active",
    { opacity: 0, x: 50 },
    { opacity: 1, x: 0, duration: 0.5, ease: "power2.out" }
  );

  updateUI();
  updateTranscript();
}

${this.getAudioFunctionsForStandalone()}

${this.getUtilityFunctionsForStandalone()}

// Event listeners
prevBtn.addEventListener("click", prevSlide);
nextBtn.addEventListener("click", nextSlide);
modalClose.addEventListener("click", closePopup);
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) {
    closePopup();
  }
});

// Audio event listeners
audioPlayBtn.addEventListener("click", () => {
  if (isPlaying) {
    pauseAudio();
  } else {
    playAudio();
  }
});
audioRestartBtn.addEventListener("click", restartAudio);
audioTranscriptBtn.addEventListener("click", toggleTranscript);
audioTranscriptClose.addEventListener("click", () => {
  audioTranscript.classList.remove("active");
});

// Keyboard navigation
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") prevSlide();
  if (e.key === "ArrowRight") nextSlide();
  if (e.key === "Escape") {
    closePopup();
    audioTranscript.classList.remove("active");
  }
  if (e.key === " ") {
    e.preventDefault();
    if (isPlaying) {
      pauseAudio();
    } else {
      playAudio();
    }
  }
});

// Initialize
renderSlide();`;
  },

  getSlideRenderersForStandalone() {
    return `// Render functions
function renderTitleSlide(data) {
  return \`
    <div class="slide active title-slide">
        <h1>\${data}</h1>
        <div class="title-divider"></div>
    </div>
  \`;
}

function renderCourseInfo(data) {
  return \`
    <div class="slide active">
        <div class="card">
            <h2 class="card-header">\${data.header}</h2>
            <p class="card-content">\${data.content}</p>
        </div>
    </div>
  \`;
}

function renderFAQ(data) {
  const items = data.items
    .map(
      (item) => \`
        <div class="faq-item">
            <h3 class="faq-question">\${item.question}</h3>
            <p class="faq-answer">\${item.answer}</p>
        </div>
      \`
    )
    .join("");

  return \`
    <div class="slide active">
        <div style="max-width: 800px; margin: 0 auto;">
            <h2 class="card-header text-center mb-8">\${data.header}</h2>
            \${items}
        </div>
    </div>
  \`;
}

function renderTextAndImage(data) {
  return \`
    <div class="slide active">
        <div style="max-width: 1000px; margin: 0 auto;">
            <h2 class="card-header text-center mb-8">\${data.header}</h2>
            <div class="text-image-container">
                <div>
                    <p class="card-content">\${data.text}</p>
                </div>
                <div>
                    <img src="\${data.image}" alt="Development" />
                </div>
            </div>
        </div>
    </div>
  \`;
}

function renderTextAndBullets(data) {
  const bullets = data.bullets
    .map(
      (bullet) => \`
        <li class="bullet-item">
            <div class="bullet-dot"></div>
            <span>\${bullet}</span>
        </li>
      \`
    )
    .join("");

  return \`
    <div class="slide active">
        <div style="max-width: 800px; margin: 0 auto;">
            <h2 class="card-header">\${data.header}</h2>
            <p class="card-content mb-6">\${data.text}</p>
            <ul class="bullet-list">
                \${bullets}
            </ul>
        </div>
    </div>
  \`;
}

function renderIconsWithTitles(data) {
  const icons = data.icons
    .map(
      (item) => \`
        <div class="icon-card">
            <i data-lucide="\${item.icon}"></i>
            <h3>\${item.title}</h3>
            <p>\${item.description}</p>
        </div>
      \`
    )
    .join("");

  return \`
    <div class="slide active">
        <div style="max-width: 1000px; margin: 0 auto;">
            <h2 class="card-header text-center mb-8">\${data.header}</h2>
            <div class="grid grid-cols-3">
                \${icons}
            </div>
        </div>
    </div>
  \`;
}

function renderFlipCards(data) {
  const cards = data
    .map(
      (card, index) => \`
        <div class="flip-card" onclick="toggleCard(\${index})">
            <div class="flip-card-inner">
                <div class="flip-card-front">
                    <p>\${card.front}</p>
                </div>
                <div class="flip-card-back">
                    <p>\${card.back}</p>
                </div>
            </div>
        </div>
      \`
    )
    .join("");

  return \`
    <div class="slide active">
        <div style="width: 100%; max-width: 1400px; margin: 0 auto; padding: 0 2rem;">
            <h2 class="card-header text-center mb-8">Key Concepts</h2>
            <div class="flip-cards-grid">
                \${cards}
            </div>
        </div>
    </div>
  \`;
}

function renderMultipleChoice(data) {
  const questionId = currentSlide;
  const userAnswer = selectedAnswers[questionId];
  const showQuestionFeedback = showFeedback[questionId];

  const options = data.options
    .map((option, index) => {
      let className = "choice-option";
      if (userAnswer === index) {
        className += index === data.correctAnswer ? " correct" : " incorrect";
      }

      return \`
        <button class="\${className}" onclick="handleAnswerSelect(\${questionId}, \${index})">
            \${option}
        </button>
      \`;
    })
    .join("");

  const feedbackHtml = showQuestionFeedback
    ? \`
        <div class="feedback \${
          userAnswer === data.correctAnswer ? "correct" : "incorrect"
        }">
            \${
              userAnswer === data.correctAnswer
                ? data.feedback.correct
                : data.feedback.incorrect
            }
        </div>
      \`
    : "";

  return \`
    <div class="slide active">
        <div style="max-width: 800px; margin: 0 auto;">
            <h2 class="card-header">Knowledge Check</h2>
            <div class="card">
                <h3 class="mb-6" style="font-size: 1.25rem; font-weight: 600;">\${data.question}</h3>
                \${options}
                \${feedbackHtml}
            </div>
        </div>
    </div>
  \`;
}

function renderTabs(data) {
  const activeTabIndex = activeTabs[currentSlide] || 0;

  const tabButtons = data
    .map(
      (tab, index) => \`
        <button class="tab-button \${index === activeTabIndex ? "active" : ""}" 
                onclick="setActiveTab(\${currentSlide}, \${index})">
            \${tab.title}
        </button>
      \`
    )
    .join("");

  return \`
    <div class="slide active">
        <div style="max-width: 800px; margin: 0 auto;">
            <h2 class="card-header text-center mb-8">Course Curriculum</h2>
            <div class="tabs-container">
                <div class="tabs-nav">
                    \${tabButtons}
                </div>
                <div class="tab-content">
                    \${data[activeTabIndex].content}
                </div>
            </div>
        </div>
    </div>
  \`;
}

function renderPopups(data) {
  const popupTriggers = data
    .map(
      (popup, index) => \`
        <button class="popup-trigger" onclick="openPopup(\${index})">
            <div class="popup-trigger-header">
                <i data-lucide="info"></i>
                <h3>\${popup.title}</h3>
            </div>
            <p>Click to learn more</p>
        </button>
      \`
    )
    .join("");

  return \`
    <div class="slide active">
        <div style="max-width: 1000px; margin: 0 auto;">
            <h2 class="card-header text-center mb-8">Additional Resources</h2>
            <div class="popup-grid">
                \${popupTriggers}
            </div>
        </div>
    </div>
  \`;
}`;
  },

  getAudioFunctionsForStandalone() {
    return `// Audio functions
function getCurrentAudioScript() {
  const slide = slides[currentSlide];
  if (slide && slide.audioScript) {
    return slide.audioScript;
  } else {
    return \`This slide doesn't have audio narration available. You can navigate to the next slide using the Next button or the right arrow key.\`;
  }
}

function updateTranscript() {
  const audioScript = getCurrentAudioScript();
  audioTranscriptContent.textContent = audioScript;
}

function toggleTranscript() {
  if (audioTranscript.classList.contains("active")) {
    audioTranscript.classList.remove("active");
  } else {
    audioTranscript.classList.add("active");
  }
}

function playAudio() {
  const audioScript = getCurrentAudioScript();

  if (isPaused && currentUtterance) {
    speechSynthesis.resume();
    isPaused = false;
    isPlaying = true;
  } else {
    stopAudio();
    currentUtterance = new SpeechSynthesisUtterance(audioScript);

    currentUtterance.rate = 0.9;
    currentUtterance.pitch = 1;
    currentUtterance.volume = 1;

    currentUtterance.onstart = () => {
      isPlaying = true;
      isPaused = false;
      updatePlayButton();
      startProgressTracking();
    };

    currentUtterance.onend = () => {
      isPlaying = false;
      isPaused = false;      
      audioProgressFill.style.width = "100%";
      updatePlayButton();
      stopProgressTracking();
    };

    currentUtterance.onerror = () => {
      isPlaying = false;
      isPaused = false;
      updatePlayButton();
      stopProgressTracking();
    };

    speechSynthesis.speak(currentUtterance);
  }

  updatePlayButton();
}

function pauseAudio() {
  if (isPlaying && !isPaused) {
    speechSynthesis.pause();
    isPaused = true;
    isPlaying = false;
    updatePlayButton();
    stopProgressTracking();
  }
}

function stopAudio() {
  if (currentUtterance) {
    speechSynthesis.cancel();
    currentUtterance = null;
  }
  isPlaying = false;
  isPaused = false;
  audioProgressFill.style.width = "0%";
  updatePlayButton();
  stopProgressTracking();
}

function restartAudio() {
  stopAudio();
  setTimeout(playAudio, 100);
}

function updatePlayButton() {
  if (isPlaying) {
    audioPlayIcon.setAttribute("data-lucide", "pause");
  } else {
    audioPlayIcon.setAttribute("data-lucide", "play");
  }
  lucide.createIcons();
}

function startProgressTracking() {
  if (audioProgressInterval) clearInterval(audioProgressInterval);

  let startTime = Date.now();
  const audioScript = getCurrentAudioScript();
  const estimatedDuration = (audioScript.length / 12) * 1000;

  audioProgressInterval = setInterval(() => {
    if (isPlaying && !isPaused) {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / estimatedDuration) * 100, 100);
      audioProgressFill.style.width = progress + "%";
    }
  }, 100);
}

function stopProgressTracking() {
  if (audioProgressInterval) {
    clearInterval(audioProgressInterval);
    audioProgressInterval = null;
  }
}`;
  },

  getUtilityFunctionsForStandalone() {
    return `function updateUI() {
  const progress = slides.length > 0 ? ((currentSlide + 1) / slides.length) * 100 : 0;
  progressFill.style.width = \`\${progress}%\`;
  progressText.textContent = slides.length > 0 ? \`\${currentSlide + 1} of \${slides.length}\` : "0 of 0";

  prevBtn.disabled = currentSlide === 0 || slides.length === 0;
  nextBtn.disabled = currentSlide === slides.length - 1 || slides.length === 0;

  if (slides.length > 0) {
    const slideType = slides[currentSlide].type;
    slideIndicator.textContent = slideType.charAt(0).toUpperCase() + slideType.slice(1);
  } else {
    slideIndicator.textContent = "No Slides";
  }
}

// Event handlers
function nextSlide() {
  if (currentSlide < slides.length - 1) {
    stopAudio();
    currentSlide++;
    renderSlide();
  }
}

function prevSlide() {
  if (currentSlide > 0) {
    stopAudio();
    currentSlide--;
    renderSlide();
  }
}

function handleAnswerSelect(questionId, selectedOption) {
  selectedAnswers[questionId] = selectedOption;
  showFeedback[questionId] = true;
  renderSlide();
}

function toggleCard(cardIndex) {
  const card = document.querySelectorAll(".flip-card")[cardIndex];
  if (flippedCards.has(cardIndex)) {
    flippedCards.delete(cardIndex);
    card.classList.remove("flipped");
  } else {
    flippedCards.add(cardIndex);
    card.classList.add("flipped");
  }
}

function setActiveTab(slideIndex, tabIndex) {
  activeTabs[slideIndex] = tabIndex;
  renderSlide();
}

function openPopup(index) {
  const popup = slides.find(s => s.type === 'popups').data[index];
  modalTitle.textContent = popup.title;
  modalText.textContent = popup.content;
  modalOverlay.classList.add("active");

  gsap.fromTo(
    ".modal-content",
    { scale: 0.8, opacity: 0 },
    { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(1.7)" }
  );
}

function closePopup() {
  gsap.to(".modal-content", {
    scale: 0.8,
    opacity: 0,
    duration: 0.2,
    ease: "power2.in",
    onComplete: () => {
      modalOverlay.classList.remove("active");
    },
  });
}`;
  },

  generateHTMLTemplate(cssContent, standaloneJS) {
    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Interactive Course Slides</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
    <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>
    <style>
      ${cssContent}
    </style>
  </head>
  <body>
    <div class="container">
      <!-- Progress Bar -->
      <div class="progress-container">
        <div class="progress-bar">
          <div class="progress-fill" id="progressFill"></div>
        </div>
        <div class="progress-text" id="progressText">1 of 10</div>
      </div>

      <!-- Slide Container -->
      <div class="slide-container">
        <div id="slideContent"></div>
      </div>

      <!-- Navigation -->
      <div class="navigation">
        <button class="nav-button prev" id="prevBtn">
          <i data-lucide="chevron-left"></i>
          <span style="margin-left: 0.5rem">Previous</span>
        </button>
        <div style="display: flex; align-items: center; gap: 1rem">
          <span class="slide-indicator" id="slideIndicator">Title</span>
        </div>
        <button class="nav-button next" id="nextBtn">
          <span style="margin-right: 0.5rem">Next</span>
          <i data-lucide="chevron-right"></i>
        </button>
      </div>
    </div>

    <!-- Audio Controls -->
    <div class="audio-controls" id="audioControls">
      <button class="audio-btn play" id="audioPlayBtn">
        <i data-lucide="play" id="audioPlayIcon"></i>
      </button>
      <button class="audio-btn secondary" id="audioRestartBtn">
        <i data-lucide="rotate-ccw"></i>
      </button>
      <button class="audio-btn secondary" id="audioTranscriptBtn">
        <i data-lucide="file-text"></i>
      </button>
      <div class="audio-progress">
        <div class="audio-progress-fill" id="audioProgressFill"></div>
      </div>
    </div>

    <!-- Audio Transcript Panel -->
    <div class="audio-transcript" id="audioTranscript">
      <div class="audio-transcript-header">
        <h4>Audio Transcript</h4>
        <button class="audio-transcript-close" id="audioTranscriptClose">
          <i data-lucide="x"></i>
        </button>
      </div>
      <div class="audio-transcript-content" id="audioTranscriptContent">
        No transcript available for this slide.
      </div>
    </div>

    <!-- Modal -->
    <div class="modal-overlay" id="modalOverlay">
      <div class="modal-content">
        <button class="modal-close" id="modalClose">&times;</button>
        <h3 class="modal-title" id="modalTitle"></h3>
        <p class="modal-text" id="modalText"></p>
      </div>
    </div>

    <script>
      ${standaloneJS}
    </script>
  </body>
</html>`;
  },
};
