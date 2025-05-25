// Main application entry point
// Initialize Lucide icons
lucide.createIcons();

// Global application state - accessible by all modules
window.currentSlide = 0;
window.selectedAnswers = {};
window.showFeedback = {};
window.flippedCards = new Set();
window.activeTabs = {};
window.editingSlideIndex = -1;
window.slides = [];

// Local references for convenience
let currentSlide = window.currentSlide;
let selectedAnswers = window.selectedAnswers;
let showFeedback = window.showFeedback;
let flippedCards = window.flippedCards;
let activeTabs = window.activeTabs;
let editingSlideIndex = window.editingSlideIndex;
let slides = window.slides;

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

// JSON loading elements
const loadJsonBtn = document.getElementById("loadJsonBtn");
const downloadBtn = document.getElementById("downloadBtn");
const jsonModalOverlay = document.getElementById("jsonModalOverlay");
const jsonModalClose = document.getElementById("jsonModalClose");
const jsonFileInput = document.getElementById("jsonFileInput");
const jsonTextarea = document.getElementById("jsonTextarea");
const jsonLoadBtn = document.getElementById("jsonLoadBtn");
const jsonCancelBtn = document.getElementById("jsonCancelBtn");

// Slide management elements
const manageBtn = document.getElementById("manageBtn");
const slideManager = document.getElementById("slideManager");
const closeManagerBtn = document.getElementById("closeManagerBtn");
const slideList = document.getElementById("slideList");
const addSlideBtn = document.getElementById("addSlideBtn");
const editSlideBtn = document.getElementById("editSlideBtn");
const deleteSlideBtn = document.getElementById("deleteSlideBtn");

// Slide edit modal elements
const slideEditModal = document.getElementById("slideEditModal");
const slideEditClose = document.getElementById("slideEditClose");
const slideEditTitle = document.getElementById("slideEditTitle");
const slideEditForm = document.getElementById("slideEditForm");
const slideTypeSelect = document.getElementById("slideTypeSelect");
const slideEditFields = document.getElementById("slideEditFields");
const slideEditCancel = document.getElementById("slideEditCancel");

// Audio elements
const audioControls = document.getElementById("audioControls");
const audioPlayBtn = document.getElementById("audioPlayBtn");
const audioPlayIcon = document.getElementById("audioPlayIcon");
const audioRestartBtn = document.getElementById("audioRestartBtn");
const audioTranscriptBtn = document.getElementById("audioTranscriptBtn");
const audioEditBtn = document.getElementById("audioEditBtn");
const audioProgressFill = document.getElementById("audioProgressFill");
const audioStatus = document.getElementById("audioStatus");
const audioTranscript = document.getElementById("audioTranscript");
const audioTranscriptClose = document.getElementById("audioTranscriptClose");
const audioTranscriptContent = document.getElementById(
  "audioTranscriptContent"
);

// AI Help event listeners
document
  .getElementById("aiHelpBtn")
  .addEventListener("click", AIHelper.openAIHelpModal);
document
  .getElementById("aiHelpClose")
  .addEventListener("click", AIHelper.closeAIHelpModal);
document
  .getElementById("aiHelpCancel")
  .addEventListener("click", AIHelper.closeAIHelpModal);
document
  .getElementById("copyPromptBtn")
  .addEventListener("click", () => AIHelper.copyPromptToClipboard());

// Close modal when clicking outside
document.getElementById("aiHelpModal").addEventListener("click", (e) => {
  if (e.target === document.getElementById("aiHelpModal")) {
    AIHelper.closeAIHelpModal();
  }
});

// Main render function
function renderSlide() {
  if (window.slides.length === 0) {
    slideContent.innerHTML = `
      <div class="slide active" style="text-align: center; padding: 5rem 0;">
        <h2>No slides available</h2>
        <p style="color: #6b7280; margin-top: 1rem;">Load a JSON file or add slides to get started.</p>
      </div>
    `;
    return;
  }

  const slide = window.slides[window.currentSlide];
  let html = "";

  switch (slide.type) {
    case "title":
      html = SlideRenderers.renderTitleSlide(slide.data);
      break;
    case "courseInfo":
      html = SlideRenderers.renderCourseInfo(slide.data);
      break;
    case "faq":
      html = SlideRenderers.renderFAQ(slide.data);
      break;
    case "textAndImage":
      html = SlideRenderers.renderTextAndImage(slide.data);
      break;
    case "textAndBullets":
      html = SlideRenderers.renderTextAndBullets(slide.data);
      break;
    case "iconsWithTitles":
      html = SlideRenderers.renderIconsWithTitles(slide.data);
      break;
    case "flipCards":
      html = SlideRenderers.renderFlipCards(slide.data);
      break;
    case "multipleChoice":
      html = SlideRenderers.renderMultipleChoice(
        slide.data,
        window.currentSlide,
        window.selectedAnswers,
        window.showFeedback
      );
      break;
    case "tabs":
      html = SlideRenderers.renderTabs(
        slide.data,
        window.currentSlide,
        window.activeTabs
      );
      break;
    case "popups":
      html = SlideRenderers.renderPopups(slide.data);
      break;
  }

  slideContent.innerHTML = html;
  lucide.createIcons();

  // Animate slide in with GSAP
  gsap.fromTo(
    ".slide.active",
    { opacity: 0, x: 50 },
    { opacity: 1, x: 0, duration: 0.5, ease: "power2.out" }
  );

  updateUI();
  AudioManager.updateTranscript();
}

function updateUI() {
  const progress =
    window.slides.length > 0
      ? ((window.currentSlide + 1) / window.slides.length) * 100
      : 0;
  progressFill.style.width = `${progress}%`;
  progressText.textContent =
    window.slides.length > 0
      ? `${window.currentSlide + 1} of ${window.slides.length}`
      : "0 of 0";

  prevBtn.disabled = window.currentSlide === 0 || window.slides.length === 0;
  nextBtn.disabled =
    window.currentSlide === window.slides.length - 1 ||
    window.slides.length === 0;

  if (window.slides.length > 0) {
    const slideType = window.slides[window.currentSlide].type;
    slideIndicator.textContent =
      slideType.charAt(0).toUpperCase() + slideType.slice(1);
  } else {
    slideIndicator.textContent = "No Slides";
  }
}

// Event handlers
function nextSlide() {
  if (window.currentSlide < window.slides.length - 1) {
    AudioManager.stopAudio();
    window.currentSlide++;
    renderSlide();
  }
}

function prevSlide() {
  if (window.currentSlide > 0) {
    AudioManager.stopAudio();
    window.currentSlide--;
    renderSlide();
  }
}

function handleAnswerSelect(questionId, selectedOption) {
  window.selectedAnswers[questionId] = selectedOption;
  window.showFeedback[questionId] = true;
  renderSlide();
  AudioManager.updateTranscript(); // Update transcript after any slide change
}

function toggleCard(cardIndex) {
  const card = document.querySelectorAll(".flip-card")[cardIndex];
  if (window.flippedCards.has(cardIndex)) {
    window.flippedCards.delete(cardIndex);
    card.classList.remove("flipped");
  } else {
    window.flippedCards.add(cardIndex);
    card.classList.add("flipped");
  }
}

function setActiveTab(slideIndex, tabIndex) {
  window.activeTabs[slideIndex] = tabIndex;
  renderSlide();
  AudioManager.updateTranscript(); // Update transcript after tab change
}

function openPopup(index) {
  const popup = CourseData.courseData.popups[index];
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
}

// Event listeners
prevBtn.addEventListener("click", prevSlide);
nextBtn.addEventListener("click", nextSlide);
modalClose.addEventListener("click", closePopup);
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) {
    closePopup();
  }
});

// JSON loading event listeners
loadJsonBtn.addEventListener("click", JSONLoader.openJsonModal);
downloadBtn.addEventListener("click", CourseDownloader.downloadCourse);
jsonModalClose.addEventListener("click", JSONLoader.closeJsonModal);
jsonCancelBtn.addEventListener("click", JSONLoader.closeJsonModal);
jsonFileInput.addEventListener("change", JSONLoader.loadJsonFile);
jsonLoadBtn.addEventListener("click", JSONLoader.updateCourseData);
jsonModalOverlay.addEventListener("click", (e) => {
  if (e.target === jsonModalOverlay) {
    JSONLoader.closeJsonModal();
  }
});

// Slide management event listeners
manageBtn.addEventListener("click", () => {
  slideManager.classList.toggle("hidden");
  if (!slideManager.classList.contains("hidden")) {
    SlideManager.renderSlideManager();
  }
});

closeManagerBtn.addEventListener("click", () => {
  slideManager.classList.add("hidden");
});

addSlideBtn.addEventListener("click", () => {
  SlideEditor.openSlideEditModal();
});

editSlideBtn.addEventListener("click", () => {
  if (window.slides.length > 0) {
    SlideEditor.openSlideEditModal(window.currentSlide);
  }
});

deleteSlideBtn.addEventListener("click", () => {
  if (window.slides.length > 0) {
    SlideManager.confirmDeleteSlide(window.currentSlide);
  }
});

// Slide edit modal event listeners
slideEditClose.addEventListener("click", SlideEditor.closeSlideEditModal);
slideEditCancel.addEventListener("click", SlideEditor.closeSlideEditModal);
slideEditModal.addEventListener("click", (e) => {
  if (e.target === slideEditModal) {
    SlideEditor.closeSlideEditModal();
  }
});

slideTypeSelect.addEventListener("change", (e) => {
  SlideEditor.generateSlideEditFields(e.target.value);
});

slideEditForm.addEventListener("submit", (e) => {
  e.preventDefault();
  SlideEditor.saveSlide();
});

// Audio event listeners
audioPlayBtn.addEventListener("click", () => {
  if (AudioManager.isPlaying) {
    AudioManager.pauseAudio();
  } else {
    AudioManager.playAudio();
  }
});
audioRestartBtn.addEventListener("click", AudioManager.restartAudio);
audioTranscriptBtn.addEventListener("click", AudioManager.toggleTranscript);
audioEditBtn.addEventListener("click", () => {
  if (window.slides.length > 0) {
    SlideEditor.openSlideEditModal(window.currentSlide);
    // Auto-focus on the audio script field after a short delay
    setTimeout(() => {
      const audioScriptField = document.getElementById("field_audioScript");
      if (audioScriptField) {
        audioScriptField.focus();
        audioScriptField.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }, 400);
  }
});
audioTranscriptClose.addEventListener("click", () => {
  audioTranscript.classList.remove("active");
});

// Keyboard navigation
document.addEventListener("keydown", (e) => {
  // Check if user is typing in an input field
  const activeElement = document.activeElement;
  const isTyping =
    activeElement &&
    (activeElement.tagName === "INPUT" ||
      activeElement.tagName === "TEXTAREA" ||
      activeElement.contentEditable === "true" ||
      activeElement.isContentEditable);

  // Only handle keyboard shortcuts if not typing
  if (!isTyping) {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      prevSlide();
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      nextSlide();
    }
    if (e.key === " ") {
      e.preventDefault();
      if (AudioManager.isPlaying) {
        AudioManager.pauseAudio();
      } else {
        AudioManager.playAudio();
      }
    }
  }

  // Escape key works regardless of typing state
  if (e.key === "Escape") {
    closePopup();
    audioTranscript.classList.remove("active");
    if (!slideManager.classList.contains("hidden")) {
      slideManager.classList.add("hidden");
    }
    if (slideEditModal.classList.contains("active")) {
      SlideEditor.closeSlideEditModal();
    }
  }
});

// Initialize
window.slides.push(...CourseData.buildSlidesArray(CourseData.courseData));
renderSlide();
