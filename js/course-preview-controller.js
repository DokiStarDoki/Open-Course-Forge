/**
 * Course Forge MVP - Course Preview Controller (FIXED VERSION)
 * This should REPLACE the existing course-preview-controller.js file
 * Handles course preview functionality with Rise 360-style vertical scrolling
 */

class CoursePreviewController {
  constructor(stateManager, eventSystem) {
    this.stateManager = stateManager;
    this.eventSystem = eventSystem;
    this.previewWindows = new Set();

    this.setupEventListeners();

    if (CONFIG.DEBUG.ENABLED) {
      console.log("CoursePreviewController initialized (Vertical Scroll Mode)");
    }
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    this.eventSystem.on("preview:open", () => {
      this.previewCourse();
    });

    this.eventSystem.on("preview:close-all", () => {
      this.closeAllPreviews();
    });

    // Clean up preview windows when they're closed
    window.addEventListener("beforeunload", () => {
      this.closeAllPreviews();
    });
  }

  /**
   * Preview course in a new window with vertical scroll layout
   */
  previewCourse() {
    const chunks = this.stateManager.getState("chunks") || [];
    const courseConfig = this.stateManager.getState("courseConfig");

    console.log("=== PREVIEW COURSE DEBUG ===");
    console.log("Total chunks:", chunks.length);
    console.log(
      "Chunks with content:",
      chunks.filter((chunk) => chunk.generatedContent).length
    );
    console.log("Course config:", courseConfig);

    // Check if there's content to preview
    const chunksWithContent = chunks.filter((chunk) => chunk.generatedContent);
    if (chunksWithContent.length === 0) {
      StatusManager.showWarning(
        "No generated content to preview. Please generate some slides first."
      );
      return;
    }

    try {
      // Create preview window
      const previewWindow = window.open(
        "",
        "coursePreview",
        "width=1200,height=800,scrollbars=yes,resizable=yes"
      );

      if (!previewWindow) {
        throw new Error(
          "Popup blocked. Please allow popups for course preview."
        );
      }

      // Track the window
      this.previewWindows.add(previewWindow);

      // Clean up when window is closed
      const checkClosed = setInterval(() => {
        if (previewWindow.closed) {
          this.previewWindows.delete(previewWindow);
          clearInterval(checkClosed);
        }
      }, 1000);

      // Generate preview HTML in vertical scroll format
      const previewHTML = this.generateVerticalScrollHTML(
        courseConfig,
        chunksWithContent
      );

      // Write to preview window
      previewWindow.document.write(previewHTML);
      previewWindow.document.close();

      // Focus the preview window
      previewWindow.focus();

      StatusManager.showSuccess("Course preview opened in new window");

      this.eventSystem.emit("preview:opened", {
        slideCount: chunksWithContent.length,
        courseTitle: courseConfig.title,
        format: "vertical-scroll",
      });
    } catch (error) {
      console.error("Preview generation failed:", error);
      StatusManager.showError(`Preview failed: ${error.message}`);
      this.eventSystem.emit("preview:failed", { error: error.message });
    }
  }

  /**
   * Generate HTML for vertical scroll course preview
   */
  generateVerticalScrollHTML(courseConfig, chunks) {
    console.log("=== GENERATING PREVIEW HTML ===");
    console.log("Chunks to render:", chunks.length);

    const sectionsHTML = chunks
      .sort((a, b) => a.order - b.order)
      .map((chunk, index) => {
        console.log(
          `Rendering chunk ${index}:`,
          chunk.title,
          "Type:",
          chunk.slideType,
          "Has content:",
          !!chunk.generatedContent
        );

        const slideContent = window.slideRenderer
          ? window.slideRenderer.renderSlide(chunk, false)
          : this.renderBasicSlidePreview(chunk);

        return `
          <section class="course-section" id="section-${index}" data-section="${index}">
            <div class="section-content">
              ${slideContent}
            </div>
            ${
              index < chunks.length - 1
                ? '<div class="section-divider"></div>'
                : ""
            }
          </section>
        `;
      })
      .join("");

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Preview: ${this.escapeHtml(courseConfig.title)}</title>
        <style>
          ${this.getVerticalScrollStyles()}
        </style>
        <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>
      </head>
      <body>
        <!-- Fixed Header with Progress -->
        <header class="course-header-fixed">
          <div class="header-content">
            <h1 class="course-title-small">${this.escapeHtml(
              courseConfig.title
            )}</h1>
            <div class="progress-container">
              <div class="progress-bar">
                <div class="progress-fill" id="progressFill"></div>
              </div>
              <span class="progress-text" id="progressText">0%</span>
            </div>
          </div>
        </header>

        <!-- Main Content Container -->
        <div class="course-container">
          <!-- Course Hero Section -->
          <header class="course-hero">
            <div class="hero-content">
              <h1 class="course-title">${this.escapeHtml(
                courseConfig.title
              )}</h1>
              ${this.renderCourseMetadata(courseConfig)}
              ${this.renderLearningObjectives(courseConfig.learningObjectives)}
              <button class="start-course-btn" onclick="startCourse()">
                <i data-lucide="play-circle"></i>
                Start Course
              </button>
            </div>
          </header>

          <!-- Course Content Sections -->
          <main class="course-content">
            ${sectionsHTML}
          </main>

          <!-- Course Completion -->
          <footer class="course-completion">
            <div class="completion-content">
              <div class="completion-icon">
                <i data-lucide="check-circle"></i>
              </div>
              <h2>Course Complete!</h2>
              <p>Congratulations on completing this course. You've covered all ${
                chunks.length
              } sections.</p>
              <div class="completion-actions">
                <button onclick="window.print()" class="btn btn-secondary">
                  <i data-lucide="printer"></i>
                  Print Certificate
                </button>
                <button onclick="restartCourse()" class="btn btn-primary">
                  <i data-lucide="refresh-cw"></i>
                  Restart Course
                </button>
              </div>
            </div>
          </footer>
        </div>

        <!-- Floating Navigation -->
        <nav class="floating-nav" id="floatingNav">
          <button onclick="scrollToSection(-1)" title="Previous Section">
            <i data-lucide="chevron-up"></i>
          </button>
          <div class="nav-sections">
            ${chunks
              .map(
                (_, index) => `
              <button class="nav-dot" onclick="scrollToSection(${index})" title="Section ${
                  index + 1
                }"></button>
            `
              )
              .join("")}
          </div>
          <button onclick="scrollToSection(1)" title="Next Section">
            <i data-lucide="chevron-down"></i>
          </button>
        </nav>

        <script>
          ${this.getVerticalScrollScript(chunks.length)}
        </script>
      </body>
      </html>
    `;
  }

  /**
   * Render course metadata section
   */
  renderCourseMetadata(courseConfig) {
    const metadata = [];

    if (courseConfig.targetAudience) {
      metadata.push(
        `<span><i data-lucide="users"></i> ${this.escapeHtml(
          courseConfig.targetAudience
        )}</span>`
      );
    }

    if (courseConfig.estimatedDuration) {
      metadata.push(
        `<span><i data-lucide="clock"></i> ${this.escapeHtml(
          courseConfig.estimatedDuration
        )}</span>`
      );
    }

    if (metadata.length === 0) return "";

    return `
      <div class="course-metadata">
        ${metadata.join("")}
      </div>
    `;
  }

  /**
   * Render learning objectives
   */
  renderLearningObjectives(objectives) {
    if (!objectives || objectives.length === 0) return "";

    return `
      <div class="learning-objectives">
        <h3>What you'll learn:</h3>
        <ul>
          ${objectives
            .map(
              (obj) =>
                `<li><i data-lucide="check"></i>${this.escapeHtml(obj)}</li>`
            )
            .join("")}
        </ul>
      </div>
    `;
  }

  /**
   * Get CSS styles for vertical scroll layout
   */
  getVerticalScrollStyles() {
    return `
      /* Reset and Base Styles */
      * { 
        margin: 0; 
        padding: 0; 
        box-sizing: border-box; 
      }
      
      html {
        scroll-behavior: smooth;
      }
      
      body { 
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
        line-height: 1.6; 
        color: #2d3748; 
        background: #f7fafc;
        overflow-x: hidden;
      }

      /* Fixed Header */
      .course-header-fixed {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        border-bottom: 1px solid #e2e8f0;
        padding: 1rem 2rem;
        z-index: 1000;
        transform: translateY(-100%);
        transition: transform 0.3s ease;
      }

      .course-header-fixed.visible {
        transform: translateY(0);
      }

      .header-content {
        max-width: 1200px;
        margin: 0 auto;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .course-title-small {
        font-size: 1.25rem;
        font-weight: 600;
        color: #2d3748;
        margin: 0;
      }

      .progress-container {
        display: flex;
        align-items: center;
        gap: 1rem;
        min-width: 200px;
      }

      .progress-bar {
        flex: 1;
        height: 8px;
        background: #e2e8f0;
        border-radius: 4px;
        overflow: hidden;
      }

      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #4299e1 0%, #3182ce 100%);
        width: 0%;
        transition: width 0.3s ease;
      }

      .progress-text {
        font-size: 0.875rem;
        font-weight: 600;
        color: #4a5568;
        min-width: 40px;
      }

      /* Main Container */
      .course-container {
        max-width: 800px;
        margin: 0 auto;
        background: white;
        min-height: 100vh;
        box-shadow: 0 0 50px rgba(0, 0, 0, 0.1);
      }

      /* Hero Section */
      .course-hero {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 4rem 3rem;
        text-align: center;
        position: relative;
        overflow: hidden;
      }

      .course-hero::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="white" opacity="0.1"/><circle cx="75" cy="75" r="1" fill="white" opacity="0.1"/><circle cx="50" cy="10" r="1" fill="white" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
        opacity: 0.3;
      }

      .hero-content {
        position: relative;
        z-index: 1;
      }

      .course-title {
        font-size: 3rem;
        font-weight: 700;
        margin-bottom: 1.5rem;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
      }

      .course-metadata {
        display: flex;
        justify-content: center;
        gap: 2rem;
        margin-bottom: 2rem;
        flex-wrap: wrap;
      }

      .course-metadata span {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 1.1rem;
        opacity: 0.9;
      }

      .learning-objectives {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 2rem;
        margin: 2rem 0;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.2);
      }

      .learning-objectives h3 {
        font-size: 1.5rem;
        margin-bottom: 1rem;
        text-align: center;
      }

      .learning-objectives ul {
        list-style: none;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1rem;
      }

      .learning-objectives li {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.5rem 0;
        font-size: 1.1rem;
      }

      .start-course-btn {
        background: rgba(255, 255, 255, 0.2);
        color: white;
        border: 2px solid rgba(255, 255, 255, 0.3);
        padding: 1rem 2rem;
        border-radius: 50px;
        font-size: 1.2rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        display: inline-flex;
        align-items: center;
        gap: 0.75rem;
        margin-top: 2rem;
        backdrop-filter: blur(10px);
      }

      .start-course-btn:hover {
        background: rgba(255, 255, 255, 0.3);
        border-color: rgba(255, 255, 255, 0.5);
        transform: translateY(-2px);
        box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
      }

      /* Course Content */
      .course-content {
        padding: 0;
      }

      .course-section {
        padding: 4rem 3rem;
        border-bottom: 1px solid #e2e8f0;
        position: relative;
        scroll-margin-top: 100px;
      }

      .course-section:last-child {
        border-bottom: none;
      }

      .section-content {
        max-width: 700px;
        margin: 0 auto;
      }

      .section-divider {
        height: 2px;
        background: linear-gradient(90deg, transparent 0%, #e2e8f0 50%, transparent 100%);
        margin: 2rem 0;
      }

      /* Slide Content Adaptations */
      .slide-content {
        background: transparent;
        border: none;
        padding: 0;
        box-shadow: none;
      }

      .slide-header {
        margin-bottom: 2rem;
        text-align: center;
      }

      .slide-title {
        font-size: 2.5rem;
        font-weight: 700;
        color: #2d3748;
        margin-bottom: 1rem;
        line-height: 1.2;
      }

      .slide-body {
        font-size: 1.1rem;
        line-height: 1.8;
      }

      /* Text and Image Layout */
      .text-and-image .slide-body {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 3rem;
        align-items: center;
      }

      .text-content {
        color: #4a5568;
      }

      .slide-image {
        width: 100%;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        transition: transform 0.3s ease;
      }

      .slide-image:hover {
        transform: scale(1.02);
      }

      /* Bullet Lists */
      .bullet-list {
        margin: 2rem 0;
        padding: 0;
      }

      .bullet-item {
        padding: 1rem 0;
        border-left: 4px solid #4299e1;
        padding-left: 2rem;
        margin: 1rem 0;
        background: #f7fafc;
        border-radius: 0 8px 8px 0;
        position: relative;
      }

      .bullet-item::before {
        content: "→";
        position: absolute;
        left: 0.75rem;
        color: #4299e1;
        font-weight: bold;
        font-size: 1.2rem;
      }

      /* Icons Grid */
      .icons-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 2rem;
        margin: 3rem 0;
      }

      .icon-item {
        background: #f7fafc;
        padding: 2rem;
        border-radius: 16px;
        text-align: center;
        transition: all 0.3s ease;
        border: 1px solid #e2e8f0;
      }

      .icon-item:hover {
        background: white;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        transform: translateY(-4px);
      }

      .icon-container {
        margin-bottom: 1.5rem;
      }

      .icon {
        width: 4rem;
        height: 4rem;
        color: #4299e1;
      }

      .icon-title {
        font-size: 1.3rem;
        font-weight: 600;
        margin-bottom: 1rem;
        color: #2d3748;
      }

      .icon-description {
        color: #4a5568;
        line-height: 1.6;
      }

      /* Multiple Choice */
      .question-text {
        font-size: 1.3rem;
        font-weight: 600;
        color: #2d3748;
        background: #edf2f7;
        padding: 2rem;
        border-radius: 12px;
        margin-bottom: 2rem;
        border-left: 4px solid #4299e1;
      }

      .options-container {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin: 2rem 0;
      }

      .option-item {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1.5rem;
        background: white;
        border: 2px solid #e2e8f0;
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .option-item:hover {
        border-color: #4299e1;
        background: #f7fafc;
        transform: translateX(4px);
      }

      .option-label {
        width: 2.5rem;
        height: 2.5rem;
        background: #edf2f7;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        color: #4a5568;
        flex-shrink: 0;
      }

      .option-item.selected .option-label {
        background: #4299e1;
        color: white;
      }

      .option-item.correct {
        border-color: #48bb78;
        background: #f0fff4;
      }

      .option-item.correct .option-label {
        background: #48bb78;
        color: white;
      }

      .option-item.incorrect {
        border-color: #f56565;
        background: #fffaf0;
      }

      .option-item.incorrect .option-label {
        background: #f56565;
        color: white;
      }

      /* Tabs */
      .tabs-container {
        margin: 2rem 0;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }

      .tab-buttons {
        display: flex;
        background: #edf2f7;
      }

      .tab-button {
        flex: 1;
        padding: 1.5rem 2rem;
        border: none;
        background: transparent;
        color: #4a5568;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        border-bottom: 3px solid transparent;
      }

      .tab-button.active {
        background: white;
        color: #4299e1;
        border-bottom-color: #4299e1;
      }

      .tab-button:hover:not(.active) {
        background: #f3f4f6;
      }

      .tab-content {
        background: white;
      }

      .tab-panel {
        display: none;
        padding: 2rem;
      }

      .tab-panel.active {
        display: block;
      }

      .tab-text {
        color: #374151;
        line-height: 1.6;
      }

      /* Flip Cards */
      .cards-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 2rem;
        margin: 3rem 0;
      }

      .flip-card {
        height: 250px;
        perspective: 1000px;
        cursor: pointer;
      }

      .flip-card-inner {
        position: relative;
        width: 100%;
        height: 100%;
        text-align: center;
        transition: transform 0.8s;
        transform-style: preserve-3d;
      }

      .flip-card.flipped .flip-card-inner {
        transform: rotateY(180deg);
      }

      .flip-card-front,
      .flip-card-back {
        position: absolute;
        width: 100%;
        height: 100%;
        backface-visibility: hidden;
        border-radius: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem;
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
      }

      .flip-card-front {
        background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%);
        color: white;
      }

      .flip-card-back {
        background: white;
        color: #2d3748;
        transform: rotateY(180deg);
        border: 1px solid #e2e8f0;
      }

      /* FAQ */
      .faq-container {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .faq-item {
        border: 1px solid #e2e8f0;
        border-radius: 0.5rem;
        overflow: hidden;
      }

      .faq-question {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 1.5rem;
        background: #f9fafb;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .faq-question:hover {
        background: #f3f4f6;
      }

      .faq-item.open .faq-question {
        background: #eff6ff;
        color: #3b82f6;
      }

      .question-text {
        font-weight: 600;
        color: #374151;
      }

      .faq-item.open .question-text {
        color: #3b82f6;
      }

      .faq-icon {
        transition: transform 0.2s ease;
        color: #6b7280;
      }

      .faq-item.open .faq-icon {
        transform: rotate(180deg);
        color: #3b82f6;
      }

      .faq-answer {
        display: none;
        padding: 1rem 1.5rem;
        background: white;
        border-top: 1px solid #e5e7eb;
      }

      .faq-item.open .faq-answer {
        display: block;
      }

      .answer-text {
        color: #374151;
        line-height: 1.6;
      }

      /* Popups */
      .popups-container {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        margin: 1.5rem 0;
      }

      .popup-trigger {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1rem;
        background: #3b82f6;
        color: white;
        border-radius: 0.5rem;
        cursor: pointer;
        transition: all 0.2s ease;
        text-decoration: none;
      }

      .popup-trigger:hover {
        background: #2563eb;
        transform: translateY(-1px);
      }

      .popup-title {
        font-weight: 500;
      }

      .popup-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      }

      .popup-content {
        background: white;
        border-radius: 0.75rem;
        max-width: 500px;
        max-height: 80vh;
        overflow-y: auto;
        margin: 1rem;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
      }

      .popup-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.5rem;
        border-bottom: 1px solid #e5e7eb;
      }

      .popup-header h3 {
        margin: 0;
        color: #1f2937;
      }

      .popup-close {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        color: #6b7280;
        padding: 0.25rem;
        border-radius: 0.25rem;
        transition: all 0.2s ease;
      }

      .popup-close:hover {
        background: #f3f4f6;
        color: #374151;
      }

      .popup-body {
        padding: 1.5rem;
        color: #374151;
        line-height: 1.6;
      }

      /* Floating Navigation */
      .floating-nav {
        position: fixed;
        right: 2rem;
        top: 50%;
        transform: translateY(-50%);
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        border-radius: 25px;
        padding: 1rem 0.5rem;
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        z-index: 100;
        opacity: 0;
        transform: translateY(-50%) translateX(100px);
        transition: all 0.3s ease;
      }

      .floating-nav.visible {
        opacity: 1;
        transform: translateY(-50%) translateX(0);
      }

      .floating-nav button {
        width: 40px;
        height: 40px;
        border: none;
        background: transparent;
        color: #4a5568;
        cursor: pointer;
        border-radius: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }

      .floating-nav button:hover {
        background: #edf2f7;
        color: #2d3748;
      }

      .nav-sections {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin: 0.5rem 0;
      }

      .nav-dot {
        width: 12px !important;
        height: 12px !important;
        border-radius: 50% !important;
        background: #cbd5e0 !important;
        border: none !important;
        cursor: pointer !important;
        transition: all 0.2s ease !important;
        padding: 0 !important;
      }

      .nav-dot:hover,
      .nav-dot.active {
        background: #4299e1 !important;
        transform: scale(1.2) !important;
      }

      /* Course Completion */
      .course-completion {
        background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
        color: white;
        padding: 4rem 3rem;
        text-align: center;
      }

      .completion-content h2 {
        font-size: 2.5rem;
        margin-bottom: 1rem;
      }

      .completion-content p {
        font-size: 1.2rem;
        margin-bottom: 2rem;
        opacity: 0.9;
      }

      .completion-icon {
        font-size: 4rem;
        margin-bottom: 2rem;
      }

      .completion-actions {
        display: flex;
        justify-content: center;
        gap: 1rem;
        flex-wrap: wrap;
      }

      .btn {
        padding: 1rem 2rem;
        border-radius: 0.5rem;
        font-weight: 600;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        transition: all 0.2s ease;
        text-decoration: none;
        border: none;
        font-size: 1rem;
      }

      .btn-primary {
        background: #4299e1;
        color: white;
      }

      .btn-primary:hover {
        background: #3182ce;
        transform: translateY(-2px);
      }

      .btn-secondary {
        background: rgba(255, 255, 255, 0.2);
        color: white;
        border: 2px solid rgba(255, 255, 255, 0.3);
      }

      .btn-secondary:hover {
        background: rgba(255, 255, 255, 0.3);
      }

      /* Responsive Design */
      @media (max-width: 768px) {
        .course-hero {
          padding: 3rem 2rem;
        }

        .course-title {
          font-size: 2rem;
        }

        .course-section {
          padding: 3rem 2rem;
        }

        .slide-title {
          font-size: 2rem;
        }

        .text-and-image .slide-body {
          grid-template-columns: 1fr;
          gap: 2rem;
        }

        .icons-grid,
        .cards-grid {
          grid-template-columns: 1fr;
        }

        .tab-buttons {
          flex-direction: column;
        }

        .floating-nav {
          right: 1rem;
        }

        .course-metadata {
          flex-direction: column;
          gap: 1rem;
        }

        .learning-objectives ul {
          grid-template-columns: 1fr;
        }

        .header-content {
          flex-direction: column;
          gap: 1rem;
        }

        .progress-container {
          min-width: auto;
          width: 100%;
        }
      }

      /* Print Styles */
      @media print {
        .course-header-fixed,
        .floating-nav,
        .start-course-btn,
        .completion-actions {
          display: none !important;
        }

        .course-section {
          break-inside: avoid;
          page-break-inside: avoid;
        }

        .course-container {
          box-shadow: none;
        }
      }

      /* Scroll Animations */
      .course-section {
        opacity: 0;
        transform: translateY(30px);
        transition: opacity 0.6s ease, transform 0.6s ease;
      }

      .course-section.in-view {
        opacity: 1;
        transform: translateY(0);
      }

      /* Loading Animation */
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(30px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .fade-in-up {
        animation: fadeInUp 0.6s ease forwards;
      }
    `;
  }

  /**
   * Get JavaScript for vertical scroll functionality
   */
  getVerticalScrollScript(totalSections) {
    return `
      let currentSection = 0;
      const totalSections = ${totalSections};
      let isScrolling = false;

      // Initialize
      document.addEventListener('DOMContentLoaded', function() {
        initializeCourse();
        setupScrollTracking();
        setupIntersectionObserver();
        
        if (typeof lucide !== 'undefined') {
          lucide.createIcons();
        }
      });

      function initializeCourse() {
        // Show floating nav after hero section
        setTimeout(() => {
          const nav = document.getElementById('floatingNav');
          if (nav) nav.classList.add('visible');
        }, 1000);

        // Initialize first nav dot as active
        updateNavigationDots(0);
      }

      function setupScrollTracking() {
        let ticking = false;

        window.addEventListener('scroll', function() {
          if (!ticking) {
            requestAnimationFrame(updateProgress);
            ticking = true;
          }
        });

        function updateProgress() {
          const scrolled = window.pageYOffset;
          const maxHeight = document.documentElement.scrollHeight - window.innerHeight;
          const progressPercentage = Math.min((scrolled / maxHeight) * 100, 100);

          // Update progress bar
          const progressFill = document.getElementById('progressFill');
          const progressText = document.getElementById('progressText');
          
          if (progressFill) {
            progressFill.style.width = progressPercentage + '%';
          }
          
          if (progressText) {
            progressText.textContent = Math.round(progressPercentage) + '%';
          }

          // Show/hide fixed header
          const header = document.querySelector('.course-header-fixed');
          const hero = document.querySelector('.course-hero');
          
          if (header && hero) {
            const heroBottom = hero.offsetTop + hero.offsetHeight;
            if (scrolled > heroBottom - 100) {
              header.classList.add('visible');
            } else {
              header.classList.remove('visible');
            }
          }

          // Update current section for navigation
          updateCurrentSection();
          
          ticking = false;
        }
      }

      function setupIntersectionObserver() {
        const sections = document.querySelectorAll('.course-section');
        
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              entry.target.classList.add('in-view');
              
              // Update current section
              const sectionIndex = parseInt(entry.target.dataset.section);
              if (!isNaN(sectionIndex)) {
                updateNavigationDots(sectionIndex);
              }
            }
          });
        }, {
          threshold: 0.3,
          rootMargin: '-100px 0px -100px 0px'
        });

        sections.forEach(section => observer.observe(section));
      }

      function updateCurrentSection() {
        const sections = document.querySelectorAll('.course-section');
        const scrolled = window.pageYOffset + window.innerHeight / 2;

        sections.forEach((section, index) => {
          const sectionTop = section.offsetTop;
          const sectionBottom = sectionTop + section.offsetHeight;
          
          if (scrolled >= sectionTop && scrolled < sectionBottom) {
            currentSection = index;
          }
        });
      }

      function updateNavigationDots(activeIndex) {
        const dots = document.querySelectorAll('.nav-dot');
        dots.forEach((dot, index) => {
          dot.classList.toggle('active', index === activeIndex);
        });
      }

      function scrollToSection(direction) {
        if (typeof direction === 'number' && direction >= 0) {
          // Direct section navigation
          const targetSection = document.getElementById(\`section-\${direction}\`);
          if (targetSection) {
            isScrolling = true;
            targetSection.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center' 
            });
            
            setTimeout(() => {
              isScrolling = false;
            }, 1000);
          }
        } else {
          // Relative navigation
          let targetIndex;
          
          if (direction === 1) {
            targetIndex = Math.min(currentSection + 1, totalSections - 1);
          } else if (direction === -1) {
            targetIndex = Math.max(currentSection - 1, 0);
          }
          
          if (typeof targetIndex !== 'undefined') {
            scrollToSection(targetIndex);
          }
        }
      }

      function startCourse() {
        const firstSection = document.getElementById('section-0');
        if (firstSection) {
          firstSection.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          });
        }
      }

      function restartCourse() {
        window.scrollTo({ 
          top: 0, 
          behavior: 'smooth' 
        });
        
        // Reset any interactive elements
        resetInteractiveElements();
      }

      function resetInteractiveElements() {
        // Reset multiple choice selections
        document.querySelectorAll('.option-item').forEach(option => {
          option.classList.remove('selected', 'correct', 'incorrect');
        });

        // Reset flip cards
        document.querySelectorAll('.flip-card').forEach(card => {
          card.classList.remove('flipped');
        });

        // Reset FAQ items
        document.querySelectorAll('.faq-item').forEach(item => {
          item.classList.remove('open');
          const answer = item.querySelector('.faq-answer');
          if (answer) answer.style.display = 'none';
        });

        // Reset tabs to first tab
        document.querySelectorAll('.tabs-container').forEach(container => {
          const buttons = container.querySelectorAll('.tab-button');
          const panels = container.querySelectorAll('.tab-panel');
          
          buttons.forEach((btn, index) => {
            btn.classList.toggle('active', index === 0);
          });
          
          panels.forEach((panel, index) => {
            panel.classList.toggle('active', index === 0);
          });
        });
      }

      // Interactive functionality from main app
      function switchTab(button, index) {
        const container = button.closest('.tabs-container');
        const buttons = container.querySelectorAll('.tab-button');
        const panels = container.querySelectorAll('.tab-panel');
        
        buttons.forEach(btn => btn.classList.remove('active'));
        panels.forEach(panel => panel.classList.remove('active'));
        
        button.classList.add('active');
        panels[index].classList.add('active');
        
        if (typeof lucide !== 'undefined') {
          lucide.createIcons();
        }
      }
      
      function toggleFaq(question) {
        const item = question.parentElement;
        const answer = item.querySelector('.faq-answer');
        const icon = question.querySelector('.faq-icon');
        
        item.classList.toggle('open');
        
        if (item.classList.contains('open')) {
          answer.style.display = 'block';
          if (icon) icon.style.transform = 'rotate(180deg)';
        } else {
          answer.style.display = 'none';
          if (icon) icon.style.transform = 'rotate(0deg)';
        }
      }
      
      function flipCard(card) {
        card.classList.toggle('flipped');
      }
      
      function selectOption(element, selectedIndex, correctIndex) {
        const container = element.closest('.options-container');
        const options = container.querySelectorAll('.option-item');
        
        options.forEach(opt => opt.classList.remove('selected', 'correct', 'incorrect'));
        element.classList.add('selected');
        
        if (selectedIndex === correctIndex) {
          element.classList.add('correct');
        } else {
          element.classList.add('incorrect');
          if (options[correctIndex]) {
            options[correctIndex].classList.add('correct');
          }
        }

        // Auto-scroll to next section after answering
        setTimeout(() => {
          const nextSection = container.closest('.course-section').nextElementSibling;
          if (nextSection && nextSection.classList.contains('course-section')) {
            nextSection.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center' 
            });
          }
        }, 1500);
      }

      // Keyboard navigation
      document.addEventListener('keydown', function(e) {
        if (isScrolling) return;
        
        switch(e.key) {
          case 'ArrowDown':
          case 'PageDown':
            e.preventDefault();
            scrollToSection(1);
            break;
          case 'ArrowUp':
          case 'PageUp':
            e.preventDefault();
            scrollToSection(-1);
            break;
          case 'Home':
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            break;
          case 'End':
            e.preventDefault();
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
            break;
          case 'Escape':
            window.close();
            break;
        }
      });

      console.log('Vertical scroll course loaded with', totalSections, 'sections');
    `;
  }

  /**
   * Render basic slide preview (fallback)
   */
  renderBasicSlidePreview(chunk) {
    if (!chunk.generatedContent) {
      return `
        <div class="empty-slide-preview">
          <i data-lucide="file-text"></i>
          <p>No content generated for this slide</p>
        </div>
      `;
    }

    return `
      <div class="basic-slide-preview">
        <h2>${this.escapeHtml(
          chunk.generatedContent.header || chunk.title
        )}</h2>
        <p>${this.escapeHtml(
          chunk.generatedContent.text || "Content preview..."
        )}</p>
      </div>
    `;
  }

  /**
   * Get slide type label
   */
  getSlideTypeLabel(slideType) {
    const slideTypeMap = new Map(
      CONFIG.SLIDE_TYPES.map((type) => [type.value, type.label])
    );
    return slideTypeMap.get(slideType) || slideType;
  }

  /**
   * Escape HTML for safe rendering
   */
  escapeHtml(text) {
    if (typeof text !== "string") return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Close all open preview windows
   */
  closeAllPreviews() {
    this.previewWindows.forEach((window) => {
      if (!window.closed) {
        window.close();
      }
    });
    this.previewWindows.clear();
  }

  /**
   * Get preview statistics
   */
  getPreviewStats() {
    return {
      openWindows: Array.from(this.previewWindows).filter((w) => !w.closed)
        .length,
      totalWindows: this.previewWindows.size,
    };
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.closeAllPreviews();
    console.log("CoursePreviewController cleaned up");
  }
}
