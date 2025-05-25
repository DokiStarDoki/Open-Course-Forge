// Slide Management Functions
const SlideManager = {
  renderSlideManager() {
    const slideItems = window.slides
      .map((slide, index) => {
        const isActive = index === window.currentSlide;
        let preview = "";

        switch (slide.type) {
          case "title":
            preview = slide.data;
            break;
          case "courseInfo":
            preview = slide.data.header;
            break;
          case "faq":
            preview = slide.data.header;
            break;
          case "textAndImage":
            preview = slide.data.header;
            break;
          case "textAndBullets":
            preview = slide.data.header;
            break;
          case "iconsWithTitles":
            preview = slide.data.header;
            break;
          case "flipCards":
            preview = `${slide.data.length} flip cards`;
            break;
          case "multipleChoice":
            preview = slide.data.question;
            break;
          case "tabs":
            preview = `${slide.data.length} tabs`;
            break;
          case "popups":
            preview = `${slide.data.length} popups`;
            break;
        }

        return `
        <div class="slide-item ${
          isActive ? "active" : ""
        }" onclick="SlideManager.goToSlide(${index})">
          <div class="slide-info">
            <div class="slide-type">${slide.type}</div>
            <div class="slide-preview">${preview}</div>
          </div>
          <div class="slide-actions">
            <button class="slide-action-btn up" onclick="event.stopPropagation(); SlideManager.moveSlide(${index}, -1)" ${
          index === 0 ? "disabled" : ""
        }>
              <i data-lucide="chevron-up"></i>
            </button>
            <button class="slide-action-btn down" onclick="event.stopPropagation(); SlideManager.moveSlide(${index}, 1)" ${
          index === window.slides.length - 1 ? "disabled" : ""
        }>
              <i data-lucide="chevron-down"></i>
            </button>
            <button class="slide-action-btn delete" onclick="event.stopPropagation(); SlideManager.confirmDeleteSlide(${index})">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </div>
      `;
      })
      .join("");

    document.getElementById("slideList").innerHTML = slideItems;
    lucide.createIcons();
  },

  goToSlide(index) {
    if (index >= 0 && index < window.slides.length) {
      window.currentSlide = index;
      renderSlide();
      AudioManager.updateTranscript(); // Update transcript when navigating
      this.renderSlideManager();
    }
  },

  moveSlide(index, direction) {
    const newIndex = index + direction;
    if (newIndex >= 0 && newIndex < window.slides.length) {
      // Swap slides
      [window.slides[index], window.slides[newIndex]] = [
        window.slides[newIndex],
        window.slides[index],
      ];

      // Update current slide if needed
      if (window.currentSlide === index) {
        window.currentSlide = newIndex;
      } else if (window.currentSlide === newIndex) {
        window.currentSlide = index;
      }

      renderSlide();
      AudioManager.updateTranscript(); // Update transcript after reordering
      this.renderSlideManager();
    }
  },

  confirmDeleteSlide(index) {
    if (
      confirm(
        `Are you sure you want to delete this ${window.slides[index].type} slide?`
      )
    ) {
      this.deleteSlide(index);
    }
  },

  deleteSlide(index) {
    window.slides.splice(index, 1);

    // Adjust current slide
    if (window.currentSlide >= window.slides.length) {
      window.currentSlide = Math.max(0, window.slides.length - 1);
    }

    renderSlide();
    AudioManager.updateTranscript(); // Update transcript after deletion
    this.renderSlideManager();
  },
};
