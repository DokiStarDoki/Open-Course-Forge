// JSON Loading Functions
const JSONLoader = {
  openJsonModal() {
    jsonModalOverlay.classList.add("active");
    gsap.fromTo(
      ".modal-content",
      { scale: 0.8, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(1.7)" }
    );
  },

  closeJsonModal() {
    gsap.to(".modal-content", {
      scale: 0.8,
      opacity: 0,
      duration: 0.2,
      ease: "power2.in",
      onComplete: () => {
        jsonModalOverlay.classList.remove("active");
        jsonTextarea.value = "";
        jsonFileInput.value = "";
      },
    });
  },

  loadJsonFile() {
    const file = jsonFileInput.files[0];
    if (file && file.type === "application/json") {
      const reader = new FileReader();
      reader.onload = function (e) {
        jsonTextarea.value = e.target.result;
      };
      reader.readAsText(file);
    } else if (file) {
      alert("Please select a valid JSON file.");
    }
  },

  updateCourseData() {
    const jsonText = jsonTextarea.value.trim();
    if (!jsonText) {
      alert("Please enter JSON data or select a file.");
      return;
    }

    try {
      const newData = JSON.parse(jsonText);

      if (newData.slides && Array.isArray(newData.slides)) {
        if (newData.slides.length === 0) {
          throw new Error("Slides array cannot be empty");
        }
      } else {
        if (!newData.title) {
          throw new Error("Missing required field: title");
        }
      }

      Object.assign(CourseData.courseData, newData);

      const newSlides = CourseData.buildSlidesArray(CourseData.courseData);
      window.slides.length = 0;
      window.slides.push(...newSlides);

      window.currentSlide = 0;
      window.selectedAnswers = {};
      window.showFeedback = {};
      window.flippedCards.clear();
      window.activeTabs = {};

      renderSlide();
      SlideManager.renderSlideManager();
      AudioManager.updateTranscript(); // Update transcript after loading new data
      this.closeJsonModal();

      gsap.from(slideContent, {
        scale: 0.95,
        opacity: 0.5,
        duration: 0.5,
        ease: "power2.out",
      });
    } catch (error) {
      alert(
        `Error loading JSON: ${error.message}\n\nPlease check your JSON format and try again.`
      );
    }
  },
};
