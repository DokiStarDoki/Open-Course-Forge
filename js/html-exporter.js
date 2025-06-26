/**
 * Course Forge MVP - HTML Exporter (UPDATED FOR VERTICAL SCROLL)
 * Handles exporting courses to standalone HTML files with Rise 360-style vertical scrolling
 */

class HTMLExporter {
  constructor() {
    if (CONFIG.DEBUG.ENABLED) {
      console.log("HTMLExporter initialized (Vertical Scroll Mode)");
    }
  }

  /**
   * Generate complete HTML course with vertical scroll layout
   */
  generateCourseHtml(courseData) {
    const slides = courseData.slides.filter((slide) => slide.content);

    const sectionsHtml = slides
      .map((slide, index) => {
        const slideHtml = window.slideRenderer
          ? window.slideRenderer.renderSlide(slide, false)
          : this.renderBasicSlide(slide);

        return `
          <section class="course-section" id="section-${index}" data-section="${index}">
            <div class="section-content">
              ${slideHtml}
            </div>
            ${
              index < slides.length - 1
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
        <title>${this.escapeHtml(courseData.course.title)}</title>
        <style>
          ${this.getCourseExportStyles()}
        </style>
        <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>
      </head>
      <body>
        <!-- Fixed Header with Progress -->
        <header class="course-header-fixed">
          <div class="header-content">
            <h1 class="course-title-small">${this.escapeHtml(
              courseData.course.title
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
                courseData.course.title
              )}</h1>
              ${this.renderCourseMetadata(courseData.course)}
              ${this.renderLearningObjectives(
                courseData.course.learningObjectives
              )}
              <button class="start-course-btn" onclick="startCourse()">
                <span class="btn-icon">▶</span>
                Start Course
              </button>
            </div>
          </header>

          <!-- Course Content Sections -->
          <main class="course-content">
            ${sectionsHtml}
          </main>

          <!-- Course Completion -->
          <footer class="course-completion">
            <div class="completion-content">
              <div class="completion-icon">✓</div>
              <h2>Course Complete!</h2>
              <p>Congratulations on completing this course. You've covered all ${
                slides.length
              } sections.</p>
              <div class="completion-stats">
                <div class="stat">
                  <div class="stat-number">${slides.length}</div>
                  <div class="stat-label">Sections Completed</div>
                </div>
                <div class="stat">
                  <div class="stat-number">${this.estimateReadingTime(
                    slides
                  )}</div>
                  <div class="stat-label">Minutes Invested</div>
                </div>
              </div>
              <div class="completion-actions">
                <button onclick="window.print()" class="btn btn-secondary">
                  <span class="btn-icon">🖨</span>
                  Print Certificate
                </button>
                <button onclick="restartCourse()" class="btn btn-primary">
                  <span class="btn-icon">↻</span>
                  Restart Course
                </button>
              </div>
            </div>
          </footer>
        </div>

        <!-- Floating Navigation -->
        <nav class="floating-nav" id="floatingNav">
          <button onclick="scrollToSection(-1)" title="Previous Section" class="nav-btn">
            <span>↑</span>
          </button>
          <div class="nav-sections">
            ${slides
              .map(
                (_, index) => `
              <button class="nav-dot" onclick="scrollToSection(${index})" title="Section ${
                  index + 1
                }"></button>
            `
              )
              .join("")}
          </div>
          <button onclick="scrollToSection(1)" title="Next Section" class="nav-btn">
            <span>↓</span>
          </button>
        </nav>

        <!-- Generated Info Footer -->
        <div class="generated-info">
          <p>Generated by Course Forge MVP on ${new Date().toLocaleDateString()}</p>
        </div>

        <script>
          ${this.getCourseExportScript(slides.length)}
        </script>
      </body>
      </html>
    `;
  }

  /**
   * Render course metadata section
   */
  renderCourseMetadata(course) {
    const metadata = [];

    if (course.targetAudience) {
      metadata.push(
        `<span><span class="meta-icon">👥</span> ${this.escapeHtml(
          course.targetAudience
        )}</span>`
      );
    }

    if (course.estimatedDuration) {
      metadata.push(
        `<span><span class="meta-icon">⏱</span> ${this.escapeHtml(
          course.estimatedDuration
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
                `<li><span class="check-icon">✓</span>${this.escapeHtml(
                  obj
                )}</li>`
            )
            .join("")}
        </ul>
      </div>
    `;
  }

  /**
   * Render basic slide fallback
   */
  renderBasicSlide(slide) {
    const content = slide.content || {};

    return `
      <div class="slide">
        <div class="slide-header">
          <h2 class="slide-title">${this.escapeHtml(slide.title)}</h2>
        </div>
        <div class="slide-body">
          ${this.renderSlideContent(content, slide.slideType)}
        </div>
      </div>
    `;
  }

  /**
   * Render slide content based on type
   */
  renderSlideContent(content, slideType) {
    switch (slideType) {
      case "textAndImage":
        return `
          <div class="text-and-image">
            <div class="content-section">
              <div class="text-content">${this.escapeHtml(
                content.text || ""
              )}</div>
            </div>
            <div class="image-section">
              ${
                content.image
                  ? `<img src="${content.image}" alt="Slide image" class="slide-image" loading="lazy">`
                  : `<div class="placeholder-image">
                     <span class="placeholder-icon">🖼</span>
                     <span class="placeholder-text">Image</span>
                   </div>`
              }
            </div>
          </div>
        `;

      case "textAndBullets":
        return `
          <div class="text-content">${this.escapeHtml(content.text || "")}</div>
          <ul class="bullet-list">
            ${(content.bullets || [])
              .map(
                (bullet) =>
                  `<li class="bullet-item">${this.escapeHtml(bullet)}</li>`
              )
              .join("")}
          </ul>
        `;

      case "multipleChoice":
        return `
          <div class="question-text">${this.escapeHtml(
            content.question || ""
          )}</div>
          <div class="options-container">
            ${(content.options || [])
              .map(
                (option, index) => `
                <div class="option-item" onclick="selectOption(this, ${index}, ${
                  content.correctAnswer || 0
                })">
                  <div class="option-label">${String.fromCharCode(
                    65 + index
                  )}</div>
                  <div class="option-text">${this.escapeHtml(option)}</div>
                </div>
              `
              )
              .join("")}
          </div>
          <div class="feedback-container" style="display: none;">
            <div class="feedback-text"></div>
          </div>
        `;

      case "iconsWithTitles":
        return `
          <div class="icons-grid">
            ${(content.icons || [])
              .map(
                (icon) => `
                <div class="icon-item">
                  <div class="icon-container">
                    <span class="icon-placeholder">${this.getIconEmoji(
                      icon.icon
                    )}</span>
                  </div>
                  <h3 class="icon-title">${this.escapeHtml(
                    icon.title || ""
                  )}</h3>
                  <p class="icon-description">${this.escapeHtml(
                    icon.description || ""
                  )}</p>
                </div>
              `
              )
              .join("")}
          </div>
        `;

      case "tabs":
        if (Array.isArray(content)) {
          return `
            <div class="tabs-container">
              <div class="tab-buttons">
                ${content
                  .map(
                    (tab, index) => `
                    <button class="tab-button ${index === 0 ? "active" : ""}" 
                            onclick="switchTab(this, ${index})">
                      ${this.escapeHtml(tab.title || `Tab ${index + 1}`)}
                    </button>
                  `
                  )
                  .join("")}
              </div>
              <div class="tab-content">
                ${content
                  .map(
                    (tab, index) => `
                    <div class="tab-panel ${
                      index === 0 ? "active" : ""
                    }" data-tab-index="${index}">
                      <div class="tab-text">${this.escapeHtml(
                        tab.content || ""
                      )}</div>
                    </div>
                  `
                  )
                  .join("")}
              </div>
            </div>
          `;
        }
        break;

      case "flipCards":
        if (Array.isArray(content)) {
          return `
            <div class="cards-grid">
              ${content
                .map(
                  (card, index) => `
                  <div class="flip-card" onclick="flipCard(this)">
                    <div class="flip-card-inner">
                      <div class="flip-card-front">
                        <div class="card-content">${this.escapeHtml(
                          card.front || ""
                        )}</div>
                      </div>
                      <div class="flip-card-back">
                        <div class="card-content">${this.escapeHtml(
                          card.back || ""
                        )}</div>
                      </div>
                    </div>
                  </div>
                `
                )
                .join("")}
            </div>
          `;
        }
        break;

      case "faq":
        return `
          <div class="faq-container">
            ${(content.items || [])
              .map(
                (item, index) => `
                <div class="faq-item">
                  <div class="faq-question" onclick="toggleFaq(this)">
                    <span class="question-text">${this.escapeHtml(
                      item.question || ""
                    )}</span>
                    <span class="faq-icon">▼</span>
                  </div>
                  <div class="faq-answer">
                    <div class="answer-text">${this.escapeHtml(
                      item.answer || ""
                    )}</div>
                  </div>
                </div>
              `
              )
              .join("")}
          </div>
        `;

      case "popups":
        if (Array.isArray(content)) {
          return `
            <div class="popups-container">
              ${content
                .map(
                  (popup, index) => `
                  <div class="popup-trigger" onclick="openPopup(${index})">
                    <span class="popup-icon">ℹ</span>
                    <span class="popup-title">${this.escapeHtml(
                      popup.title || ""
                    )}</span>
                  </div>
                `
                )
                .join("")}
            </div>
            
            ${content
              .map(
                (popup, index) => `
                <div class="popup-modal" id="popup-${index}" style="display: none;" onclick="closePopup(${index})">
                  <div class="popup-content" onclick="event.stopPropagation()">
                    <div class="popup-header">
                      <h3>${this.escapeHtml(popup.title || "")}</h3>
                      <button class="popup-close" onclick="closePopup(${index})">×</button>
                    </div>
                    <div class="popup-body">${this.escapeHtml(
                      popup.content || ""
                    )}</div>
                  </div>
                </div>
              `
              )
              .join("")}
          `;
        }
        break;

      default:
        return `<div class="default-content">${this.escapeHtml(
          JSON.stringify(content)
        )}</div>`;
    }

    return "";
  }

  /**
   * Get emoji representation for icons
   */
  getIconEmoji(iconName) {
    const iconMap = {
      target: "🎯",
      users: "👥",
      "trending-up": "📈",
      heart: "❤️",
      star: "⭐",
      check: "✓",
      x: "✗",
      circle: "⭕",
      square: "⬜",
      triangle: "🔺",
      diamond: "💎",
      lightbulb: "💡",
      gear: "⚙️",
      rocket: "🚀",
      shield: "🛡️",
      key: "🔑",
      lock: "🔒",
      unlock: "🔓",
      eye: "👁️",
      brain: "🧠",
      book: "📚",
      pencil: "✏️",
      calculator: "🧮",
      chart: "📊",
      graph: "📈",
      globe: "🌍",
      phone: "📱",
      laptop: "💻",
      email: "📧",
      camera: "📷",
      video: "🎥",
      music: "🎵",
      bell: "🔔",
      flag: "🏁",
      trophy: "🏆",
      medal: "🏅",
      crown: "👑",
      fire: "🔥",
      lightning: "⚡",
      sun: "☀️",
      moon: "🌙",
      cloud: "☁️",
      rain: "🌧️",
      snow: "❄️",
      tree: "🌳",
      flower: "🌸",
      leaf: "🍃",
    };

    return iconMap[iconName] || "📍";
  }

  /**
   * Get CSS styles for exported course (COMPREHENSIVE VERTICAL SCROLL STYLES)
   */
  getCourseExportStyles() {
    return `
      /* Reset and Base Styles */
      * { 
        margin: 0; 
        padding: 0; 
        box-sizing: border-box; 
      }
      
      html {
        scroll-behavior: smooth;
        font-size: 16px;
      }
      
      body { 
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; 
        line-height: 1.6; 
        color: #2d3748; 
        background: #f7fafc;
        overflow-x: hidden;
        font-size: 1rem;
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
        background: radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%),
                    radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 50%),
                    radial-gradient(circle at 40% 80%, rgba(255,255,255,0.1) 0%, transparent 50%);
        opacity: 0.6;
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
        line-height: 1.1;
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
        background: rgba(255, 255, 255, 0.1);
        padding: 0.5rem 1rem;
        border-radius: 20px;
        backdrop-filter: blur(5px);
      }

      .meta-icon {
        font-size: 1.2rem;
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
        margin-bottom: 1.5rem;
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
        padding: 0.75rem 0;
        font-size: 1.1rem;
      }

      .check-icon {
        color: #48bb78;
        font-weight: bold;
        font-size: 1.2rem;
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

      .btn-icon {
        font-size: 1.3rem;
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
        opacity: 0;
        transform: translateY(30px);
        transition: opacity 0.6s ease, transform 0.6s ease;
      }

      .course-section:last-child {
        border-bottom: none;
      }

      .course-section.in-view {
        opacity: 1;
        transform: translateY(0);
      }

      .section-content {
        max-width: 700px;
        margin: 0 auto;
      }

      .section-divider {
        height: 2px;
        background: linear-gradient(90deg, transparent 0%, #e2e8f0 50%, transparent 100%);
        margin: 2rem auto;
        width: 200px;
      }

      /* Slide Content */
      .slide {
        width: 100%;
      }

      .slide-header {
        margin-bottom: 3rem;
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
      .text-and-image {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 3rem;
        align-items: center;
      }

      .text-content {
        color: #4a5568;
        font-size: 1.1rem;
        line-height: 1.8;
      }

      .image-section {
        display: flex;
        justify-content: center;
        align-items: center;
      }

      .slide-image {
        width: 100%;
        max-width: 400px;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
        transition: transform 0.3s ease;
      }

      .slide-image:hover {
        transform: scale(1.02);
      }

      .placeholder-image {
        width: 100%;
        max-width: 400px;
        height: 250px;
        background: #f7fafc;
        border: 2px dashed #cbd5e0;
        border-radius: 12px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: #a0aec0;
      }

      .placeholder-icon {
        font-size: 3rem;
        margin-bottom: 0.5rem;
      }

      .placeholder-text {
        font-size: 1.1rem;
        font-weight: 500;
      }

      /* Bullet Lists */
      .bullet-list {
        margin: 2rem 0;
        padding: 0;
        list-style: none;
      }

      .bullet-item {
        padding: 1.25rem 2rem;
        border-left: 4px solid #4299e1;
        margin: 1rem 0;
        background: #f7fafc;
        border-radius: 0 8px 8px 0;
        position: relative;
        transition: all 0.3s ease;
        font-size: 1.1rem;
      }

      .bullet-item:hover {
        background: #edf2f7;
        transform: translateX(4px);
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

      .icon-placeholder {
        font-size: 4rem;
        display: block;
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

      .option-text {
        flex: 1;
        font-size: 1.1rem;
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

      .feedback-container {
        margin-top: 1.5rem;
        padding: 1rem;
        border-radius: 8px;
        font-weight: 500;
      }

      .feedback-text.correct {
        background: #f0fff4;
        color: #2f855a;
        border: 1px solid #9ae6b4;
      }

      .feedback-text.incorrect {
        background: #fed7d7;
        color: #c53030;
        border: 1px solid #feb2b2;
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
        font-size: 1rem;
      }

      .tab-button.active {
        background: white;
        color: #4299e1;
        border-bottom-color: #4299e1;
      }

      .tab-button:hover:not(.active) {
        background: #f7fafc;
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
        font-size: 1.1rem;
        line-height: 1.7;
        color: #4a5568;
      }

      /* FAQ */
      .faq-container {
        margin: 2rem 0;
      }

      .faq-item {
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        margin-bottom: 1rem;
        overflow: hidden;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
      }

      .faq-question {
        padding: 1.5rem 2rem;
        background: #f7fafc;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        transition: all 0.2s ease;
      }

      .faq-question:hover {
        background: #edf2f7;
      }

      .faq-item.open .faq-question {
        background: #edf2f7;
        border-bottom: 1px solid #e2e8f0;
      }

      .question-text {
        font-weight: 600;
        color: #2d3748;
        font-size: 1.1rem;
      }

      .faq-icon {
        color: #4a5568;
        font-size: 1.2rem;
        transition: transform 0.3s ease;
      }

      .faq-item.open .faq-icon {
        transform: rotate(180deg);
      }

      .faq-answer {
        display: none;
        padding: 2rem;
        background: white;
      }

      .faq-item.open .faq-answer {
        display: block;
      }

      .answer-text {
        color: #4a5568;
        line-height: 1.7;
        font-size: 1.05rem;
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

      .card-content {
        font-weight: 600;
        line-height: 1.5;
        font-size: 1.1rem;
        text-align: center;
      }

      /* Popups */
      .popups-container {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        margin: 2rem 0;
      }

      .popup-trigger {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1rem;
        background: #4299e1;
        color: white;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
        text-decoration: none;
        font-weight: 500;
      }

      .popup-trigger:hover {
        background: #3182ce;
        transform: translateY(-1px);
      }

      .popup-icon {
        font-size: 1.2rem;
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
        z-index: 2000;
      }

      .popup-content {
        background: white;
        border-radius: 12px;
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
        border-bottom: 1px solid #e2e8f0;
      }

      .popup-header h3 {
        margin: 0;
        color: #2d3748;
        font-size: 1.3rem;
      }

      .popup-close {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        color: #4a5568;
        padding: 0.25rem;
        border-radius: 4px;
        transition: all 0.2s ease;
      }

      .popup-close:hover {
        background: #f7fafc;
        color: #2d3748;
      }

      .popup-body {
        padding: 1.5rem;
        color: #4a5568;
        line-height: 1.6;
        font-size: 1.05rem;
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

      .nav-btn {
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
        font-size: 1.2rem;
      }

      .nav-btn:hover {
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
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #cbd5e0;
        border: none;
        cursor: pointer;
        transition: all 0.2s ease;
        padding: 0;
      }

      .nav-dot:hover,
      .nav-dot.active {
        background: #4299e1;
        transform: scale(1.2);
      }

      /* Course Completion */
      .course-completion {
        background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
        color: white;
        padding: 4rem 3rem;
        text-align: center;
        position: relative;
      }

      .completion-content h2 {
        font-size: 2.5rem;
        margin-bottom: 1rem;
        font-weight: 700;
      }

      .completion-content p {
        font-size: 1.2rem;
        margin-bottom: 2rem;
        opacity: 0.9;
      }

      .completion-icon {
        font-size: 4rem;
        margin-bottom: 2rem;
        color: white;
      }

      .completion-stats {
        display: flex;
        justify-content: center;
        gap: 3rem;
        margin: 2rem 0;
        flex-wrap: wrap;
      }

      .stat {
        text-align: center;
      }

      .stat-number {
        font-size: 2.5rem;
        font-weight: 700;
        margin-bottom: 0.5rem;
      }

      .stat-label {
        font-size: 1rem;
        opacity: 0.8;
      }

      .completion-actions {
        display: flex;
        justify-content: center;
        gap: 1rem;
        flex-wrap: wrap;
      }

      .btn {
        padding: 1rem 2rem;
        border-radius: 8px;
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

      /* Generated Info */
      .generated-info {
        text-align: center;
        padding: 1rem;
        background: #f7fafc;
        color: #4a5568;
        font-size: 0.875rem;
      }

      /* Default Content */
      .default-content {
        background: #f7fafc;
        padding: 2rem;
        border-radius: 8px;
        border: 1px solid #e2e8f0;
        font-family: monospace;
        color: #4a5568;
        overflow-x: auto;
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

        .text-and-image {
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

        .completion-stats {
          flex-direction: column;
          gap: 1rem;
        }

        .completion-actions {
          flex-direction: column;
        }

        .btn {
          width: 100%;
          justify-content: center;
        }
      }

      @media (max-width: 480px) {
        .course-hero {
          padding: 2rem 1rem;
        }

        .course-section {
          padding: 2rem 1rem;
        }

        .floating-nav {
          right: 0.5rem;
          padding: 0.75rem 0.25rem;
        }

        .nav-btn {
          width: 35px;
          height: 35px;
        }

        .popup-content {
          margin: 0.5rem;
          max-width: calc(100vw - 1rem);
        }
      }

      /* Print Styles */
      @media print {
        .course-header-fixed,
        .floating-nav,
        .start-course-btn,
        .completion-actions,
        .generated-info {
          display: none !important;
        }

        .course-section {
          break-inside: avoid;
          page-break-inside: avoid;
          opacity: 1 !important;
          transform: none !important;
        }

        .course-container {
          box-shadow: none;
        }

        .course-hero {
          background: #667eea !important;
          -webkit-print-color-adjust: exact;
          color-adjust: exact;
        }

        .flip-card-back {
          transform: none;
          position: static;
          margin-top: 1rem;
        }

        .popup-modal {
          position: static;
          background: none;
        }

        .popup-content {
          box-shadow: none;
          border: 1px solid #e2e8f0;
          margin: 1rem 0;
        }
      }

      /* Animations */
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

      @keyframes slideInRight {
        from {
          opacity: 0;
          transform: translateX(30px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }

      .fade-in-up {
        animation: fadeInUp 0.6s ease forwards;
      }

      .slide-in-right {
        animation: slideInRight 0.4s ease forwards;
      }

      /* Accessibility */
      @media (prefers-reduced-motion: reduce) {
        html {
          scroll-behavior: auto;
        }
        
        *,
        *::before,
        *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }

      /* High contrast mode */
      @media (prefers-contrast: high) {
        .course-section {
          border-bottom: 2px solid #000;
        }
        
        .option-item {
          border-width: 3px;
        }
        
        .btn {
          border: 2px solid currentColor;
        }
      }
    `;
  }

  /**
   * Get JavaScript for exported course functionality
   */
  getCourseExportScript(totalSections) {
    return `
      let currentSection = 0;
      const totalSections = ${totalSections};
      let isScrolling = false;

      // Initialize
      document.addEventListener('DOMContentLoaded', function() {
        initializeCourse();
        setupScrollTracking();
        setupIntersectionObserver();
      });

      function initializeCourse() {
        // Show floating nav after hero section
        setTimeout(() => {
          const nav = document.getElementById('floatingNav');
          if (nav) nav.classList.add('visible');
        }, 1000);

        // Initialize first nav dot as active
        updateNavigationDots(0);
        
        console.log('Course initialized with', totalSections, 'sections');
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

        // Clear feedback
        document.querySelectorAll('.feedback-container').forEach(container => {
          container.style.display = 'none';
        });
      }

      // Interactive functionality
      function switchTab(button, index) {
        const container = button.closest('.tabs-container');
        const buttons = container.querySelectorAll('.tab-button');
        const panels = container.querySelectorAll('.tab-panel');
        
        buttons.forEach(btn => btn.classList.remove('active'));
        panels.forEach(panel => panel.classList.remove('active'));
        
        button.classList.add('active');
        panels[index].classList.add('active');
      }
      
      function toggleFaq(question) {
        const item = question.parentElement;
        const answer = item.querySelector('.faq-answer');
        const icon = question.querySelector('.faq-icon');
        
        item.classList.toggle('open');
        
        if (item.classList.contains('open')) {
          answer.style.display = 'block';
          if (icon) icon.textContent = '▲';
        } else {
          answer.style.display = 'none';
          if (icon) icon.textContent = '▼';
        }
      }
      
      function flipCard(card) {
        card.classList.toggle('flipped');
      }
      
      function selectOption(element, selectedIndex, correctIndex) {
        const container = element.closest('.options-container');
        const options = container.querySelectorAll('.option-item');
        const feedback = container.parentElement.querySelector('.feedback-container');
        const feedbackText = feedback ? feedback.querySelector('.feedback-text') : null;
        
        options.forEach(opt => opt.classList.remove('selected', 'correct', 'incorrect'));
        element.classList.add('selected');
        
        if (selectedIndex === correctIndex) {
          element.classList.add('correct');
          if (feedbackText) {
            feedbackText.textContent = '✓ Correct! Well done.';
            feedbackText.className = 'feedback-text correct';
          }
        } else {
          element.classList.add('incorrect');
          if (options[correctIndex]) {
            options[correctIndex].classList.add('correct');
          }
          if (feedbackText) {
            feedbackText.textContent = '✗ Not quite right. The correct answer is highlighted.';
            feedbackText.className = 'feedback-text incorrect';
          }
        }

        if (feedback) {
          feedback.style.display = 'block';
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

      function openPopup(index) {
        const popup = document.getElementById(\`popup-\${index}\`);
        if (popup) {
          popup.style.display = 'flex';
          document.body.style.overflow = 'hidden';
        }
      }

      function closePopup(index) {
        const popup = document.getElementById(\`popup-\${index}\`);
        if (popup) {
          popup.style.display = 'none';
          document.body.style.overflow = 'auto';
        }
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
            // Close any open popups
            document.querySelectorAll('.popup-modal').forEach(popup => {
              popup.style.display = 'none';
            });
            document.body.style.overflow = 'auto';
            break;
        }
      });

      // Close popups when clicking outside
      document.addEventListener('click', function(e) {
        if (e.target.classList.contains('popup-modal')) {
          e.target.style.display = 'none';
          document.body.style.overflow = 'auto';
        }
      });

      // Save progress in localStorage
      function saveProgress() {
        try {
          const progress = {
            currentSection: currentSection,
            scrollPosition: window.pageYOffset,
            completedSections: Array.from(document.querySelectorAll('.course-section.in-view')).map(s => s.dataset.section),
            timestamp: new Date().toISOString()
          };
          
          localStorage.setItem('courseProgress', JSON.stringify(progress));
        } catch (e) {
          // Ignore localStorage errors
        }
      }

      // Load previous progress
      function loadProgress() {
        try {
          const saved = localStorage.getItem('courseProgress');
          if (saved) {
            const progress = JSON.parse(saved);
            
            // Restore scroll position after a delay
            setTimeout(() => {
              if (progress.scrollPosition > 0) {
                window.scrollTo({ top: progress.scrollPosition, behavior: 'smooth' });
              }
            }, 1000);
          }
        } catch (e) {
          // Ignore localStorage errors
        }
      }

      // Auto-save progress periodically
      setInterval(saveProgress, 30000);

      // Save progress when leaving page
      window.addEventListener('beforeunload', saveProgress);

      // Load progress on page load
      window.addEventListener('load', loadProgress);

      console.log('Vertical scroll course loaded successfully');
    `;
  }

  /**
   * Estimate reading time for slides
   */
  estimateReadingTime(slides) {
    const wordsPerMinute = 200;
    let totalWords = 0;

    slides.forEach((slide) => {
      if (slide.content) {
        totalWords += this.countWords(slide.content);
      }
    });

    return Math.max(1, Math.ceil(totalWords / wordsPerMinute));
  }

  /**
   * Count words in content object
   */
  countWords(content) {
    let words = 0;

    if (typeof content === "string") {
      return content.split(/\s+/).length;
    }

    if (typeof content === "object") {
      Object.values(content).forEach((value) => {
        if (typeof value === "string") {
          words += value.split(/\s+/).length;
        } else if (Array.isArray(value)) {
          value.forEach((item) => {
            if (typeof item === "string") {
              words += item.split(/\s+/).length;
            } else if (typeof item === "object") {
              words += this.countWords(item);
            }
          });
        } else if (typeof value === "object") {
          words += this.countWords(value);
        }
      });
    }

    return words;
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
   * Generate course with custom template
   */
  generateWithTemplate(courseData, templateName = "default") {
    // Future: Support for different export templates
    return this.generateCourseHtml(courseData);
  }

  /**
   * Generate course package (HTML + assets)
   */
  generateCoursePackage(courseData) {
    const html = this.generateCourseHtml(courseData);

    // Future: Include additional assets like images, fonts, etc.
    return {
      "index.html": html,
      "course-data.json": JSON.stringify(courseData, null, 2),
      "readme.txt": this.generateReadme(courseData),
    };
  }

  /**
   * Generate readme file for course package
   */
  generateReadme(courseData) {
    return `
Course: ${courseData.course.title}
Generated: ${new Date().toLocaleDateString()}
Sections: ${courseData.slides.length}
Format: Vertical Scroll (Rise 360 Style)

This package contains:
- index.html: The main course file (open this in a web browser)
- course-data.json: Raw course data in JSON format
- readme.txt: This file

Instructions:
1. Open index.html in any modern web browser
2. The course will work offline once loaded
3. Use keyboard navigation (arrow keys, Home/End) for quick navigation
4. Scroll naturally or use the floating navigation on the right
5. Interactive elements include multiple choice, flip cards, tabs, and FAQ
6. Progress is automatically saved and restored
7. Print functionality is available for certificates

Features:
- Responsive design that works on all devices
- Smooth scrolling between sections
- Progress tracking with visual indicator
- Interactive content elements
- Keyboard accessibility
- Print-friendly styling
- Automatic progress saving

Generated by Course Forge MVP
    `.trim();
  }
}
