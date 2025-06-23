/**
 * Course Forge MVP - Course Preview Controller
 * Handles course preview functionality and window management
 */

class CoursePreviewController {
  constructor(stateManager, eventSystem) {
    this.stateManager = stateManager;
    this.eventSystem = eventSystem;
    this.previewWindows = new Set();

    this.setupEventListeners();

    if (CONFIG.DEBUG.ENABLED) {
      console.log("CoursePreviewController initialized");
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
   * Preview course in a new window
   */
  previewCourse() {
    const chunks = this.stateManager.getState("chunks") || [];
    const courseConfig = this.stateManager.getState("courseConfig");

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

      // Generate preview HTML
      const previewHTML = this.generatePreviewHTML(
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
      });
    } catch (error) {
      console.error("Preview generation failed:", error);
      StatusManager.showError(`Preview failed: ${error.message}`);
      this.eventSystem.emit("preview:failed", { error: error.message });
    }
  }

  /**
   * Generate HTML for course preview
   */
  generatePreviewHTML(courseConfig, chunks) {
    const slidesHTML = chunks
      .sort((a, b) => a.order - b.order)
      .map((chunk, index) => {
        const slideContent = window.slideRenderer
          ? window.slideRenderer.renderSlide(chunk, false)
          : this.renderBasicSlidePreview(chunk);

        return `
          <div class="preview-slide" data-slide="${index}" ${
          index === 0 ? "" : 'style="display: none;"'
        }>
            <div class="slide-header-info">
              <span class="slide-number">${index + 1} of ${chunks.length}</span>
              <span class="slide-type">${this.getSlideTypeLabel(
                chunk.slideType
              )}</span>
            </div>
            ${slideContent}
          </div>
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
          ${this.getPreviewStyles()}
        </style>
        <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>
      </head>
      <body>
        <div class="preview-container">
          <!-- Header -->
          <header class="preview-header">
            <h1>${this.escapeHtml(courseConfig.title)}</h1>
            <div class="preview-controls">
              <button id="prevBtn" onclick="navigateSlide(-1)" disabled>
                <i data-lucide="chevron-left"></i> Previous
              </button>
              <span id="slideCounter">1 of ${chunks.length}</span>
              <button id="nextBtn" onclick="navigateSlide(1)" ${
                chunks.length <= 1 ? "disabled" : ""
              }>
                Next <i data-lucide="chevron-right"></i>
              </button>
            </div>
          </header>

          <!-- Course Meta Info -->
          <div class="course-meta">
            ${
              courseConfig.targetAudience
                ? `<span><strong>Audience:</strong> ${this.escapeHtml(
                    courseConfig.targetAudience
                  )}</span>`
                : ""
            }
            ${
              courseConfig.estimatedDuration
                ? `<span><strong>Duration:</strong> ${this.escapeHtml(
                    courseConfig.estimatedDuration
                  )}</span>`
                : ""
            }
          </div>

          <!-- Slides Container -->
          <main class="preview-content">
            ${slidesHTML}
          </main>

          <!-- Navigation Dots -->
          <div class="preview-navigation">
            ${chunks
              .map(
                (_, index) =>
                  `<button class="nav-dot ${
                    index === 0 ? "active" : ""
                  }" onclick="goToSlide(${index})" title="Slide ${
                    index + 1
                  }"></button>`
              )
              .join("")}
          </div>

          <!-- Footer -->
          <footer class="preview-footer">
            <p>Course Preview - Generated by Course Forge MVP</p>
          </footer>
        </div>

        <script>
          ${this.getPreviewScript(chunks.length)}
        </script>
      </body>
      </html>
    `;
  }

  /**
   * Get CSS styles for preview
   */
  getPreviewStyles() {
    return `
      * { margin: 0; padding: 0; box-sizing: border-box; }
      
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        background: #f8fafc;
        color: #1f2937;
        line-height: 1.6;
      }
      
      .preview-container {
        max-width: 1000px;
        margin: 0 auto;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
      }
      
      .preview-header {
        background: white;
        padding: 1.5rem 2rem;
        border-bottom: 2px solid #e5e7eb;
        display: flex;
        justify-content: space-between;
        align-items: center;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      
      .preview-header h1 {
        font-size: 1.5rem;
        color: #1f2937;
        max-width: 60%;
      }
      
      .preview-controls {
        display: flex;
        align-items: center;
        gap: 1rem;
      }
      
      .preview-controls button {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        background: #3b82f6;
        color: white;
        border: none;
        border-radius: 0.375rem;
        cursor: pointer;
        font-size: 0.875rem;
        transition: all 0.2s;
      }
      
      .preview-controls button:hover:not(:disabled) {
        background: #2563eb;
        transform: translateY(-1px);
      }
      
      .preview-controls button:disabled {
        background: #9ca3af;
        cursor: not-allowed;
        transform: none;
      }
      
      #slideCounter {
        font-weight: 500;
        color: #6b7280;
        font-size: 0.875rem;
      }

      .course-meta {
        background: #f9fafb;
        padding: 1rem 2rem;
        border-bottom: 1px solid #e5e7eb;
        display: flex;
        gap: 2rem;
        font-size: 0.875rem;
        color: #6b7280;
      }
      
      .preview-content {
        flex: 1;
        padding: 2rem;
      }
      
      .preview-slide {
        background: white;
        border-radius: 0.75rem;
        padding: 2rem;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        min-height: 500px;
        animation: slideIn 0.3s ease-out;
      }
      
      .slide-header-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid #e5e7eb;
        font-size: 0.875rem;
        color: #6b7280;
      }
      
      .slide-type {
        background: #eff6ff;
        color: #3b82f6;
        padding: 0.25rem 0.75rem;
        border-radius: 0.375rem;
        font-weight: 500;
      }

      .preview-navigation {
        display: flex;
        justify-content: center;
        padding: 1rem 2rem;
        gap: 0.5rem;
      }

      .nav-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        border: none;
        background: #d1d5db;
        cursor: pointer;
        transition: all 0.2s;
      }

      .nav-dot:hover,
      .nav-dot.active {
        background: #3b82f6;
      }
      
      .preview-footer {
        background: #f9fafb;
        padding: 1rem 2rem;
        text-align: center;
        color: #6b7280;
        font-size: 0.875rem;
        border-top: 1px solid #e5e7eb;
      }
      
      /* Copy slide styles from main app */
      .slide-content { background: transparent; }
      .slide-title { font-size: 1.5rem; margin-bottom: 1rem; color: #1f2937; }
      .bullet-list { margin: 1rem 0; padding-left: 1.5rem; }
      .bullet-item { margin: 0.5rem 0; }
      .icons-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin: 2rem 0; }
      .icon-item { text-align: center; padding: 1rem; border: 1px solid #e5e7eb; border-radius: 0.5rem; }
      .icon-title { font-weight: 600; margin: 0.5rem 0; }
      .flip-card { width: 200px; height: 150px; margin: 1rem; cursor: pointer; perspective: 1000px; }
      .flip-card-inner { transition: transform 0.6s; transform-style: preserve-3d; width: 100%; height: 100%; position: relative; }
      .flip-card.flipped .flip-card-inner { transform: rotateY(180deg); }
      .flip-card-front, .flip-card-back { position: absolute; width: 100%; height: 100%; backface-visibility: hidden; border: 1px solid #e5e7eb; border-radius: 0.5rem; display: flex; align-items: center; justify-content: center; padding: 1rem; }
      .flip-card-front { background: #3b82f6; color: white; }
      .flip-card-back { background: white; transform: rotateY(180deg); }
      .tabs-container { margin: 1rem 0; border: 1px solid #e5e7eb; border-radius: 0.5rem; overflow: hidden; }
      .tab-buttons { display: flex; background: #f9fafb; border-bottom: 1px solid #e5e7eb; }
      .tab-button { flex: 1; padding: 0.75rem 1.5rem; border: none; background: transparent; cursor: pointer; transition: all 0.2s; }
      .tab-button.active { background: white; color: #3b82f6; font-weight: 600; }
      .tab-panel { display: none; padding: 1.5rem; }
      .tab-panel.active { display: block; }
      .faq-item { margin: 1rem 0; border: 1px solid #e5e7eb; border-radius: 0.5rem; overflow: hidden; }
      .faq-question { padding: 1rem; background: #f9fafb; cursor: pointer; display: flex; justify-content: space-between; align-items: center; }
      .faq-question:hover { background: #f3f4f6; }
      .faq-answer { display: none; padding: 1rem; background: white; border-top: 1px solid #e5e7eb; }
      .faq-item.open .faq-answer { display: block; }
      .multiple-choice .option-item { padding: 0.75rem; margin: 0.5rem 0; border: 1px solid #e5e7eb; border-radius: 0.5rem; cursor: pointer; display: flex; align-items: center; gap: 1rem; }
      .multiple-choice .option-item:hover { background: #f9fafb; }
      .multiple-choice .option-item.selected { border-color: #3b82f6; background: #eff6ff; }
      .multiple-choice .option-label { width: 2rem; height: 2rem; background: #f3f4f6; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; }

      /* Animations */
      @keyframes slideIn {
        from { opacity: 0; transform: translateX(20px); }
        to { opacity: 1; transform: translateX(0); }
      }

      /* Responsive */
      @media (max-width: 768px) {
        .preview-header { flex-direction: column; gap: 1rem; }
        .preview-header h1 { max-width: 100%; text-align: center; }
        .course-meta { flex-direction: column; gap: 0.5rem; }
        .preview-content { padding: 1rem; }
        .preview-slide { padding: 1rem; }
        .icons-grid { grid-template-columns: 1fr; }
        .tab-buttons { flex-direction: column; }
      }
    `;
  }

  /**
   * Get JavaScript for preview functionality
   */
  getPreviewScript(totalSlides) {
    return `
      let currentSlide = 0;
      const totalSlides = ${totalSlides};
      
      // Initialize Lucide icons
      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }
      
      function navigateSlide(direction) {
        const newSlide = currentSlide + direction;
        
        if (newSlide < 0 || newSlide >= totalSlides) {
          return;
        }
        
        goToSlide(newSlide);
      }

      function goToSlide(slideIndex) {
        if (slideIndex < 0 || slideIndex >= totalSlides) {
          return;
        }

        // Hide current slide
        const currentSlideEl = document.querySelector(\`[data-slide="\${currentSlide}"]\`);
        if (currentSlideEl) {
          currentSlideEl.style.display = 'none';
        }
        
        // Show new slide
        const newSlideEl = document.querySelector(\`[data-slide="\${slideIndex}"]\`);
        if (newSlideEl) {
          newSlideEl.style.display = 'block';
        }
        
        currentSlide = slideIndex;
        
        // Update controls
        document.getElementById('prevBtn').disabled = currentSlide === 0;
        document.getElementById('nextBtn').disabled = currentSlide === totalSlides - 1;
        document.getElementById('slideCounter').textContent = \`\${currentSlide + 1} of \${totalSlides}\`;
        
        // Update navigation dots
        document.querySelectorAll('.nav-dot').forEach((dot, index) => {
          dot.classList.toggle('active', index === currentSlide);
        });
        
        // Re-initialize icons for new slide
        if (typeof lucide !== 'undefined') {
          lucide.createIcons();
        }
      }
      
      // Keyboard navigation
      document.addEventListener('keydown', (e) => {
        switch (e.key) {
          case 'ArrowLeft':
            navigateSlide(-1);
            break;
          case 'ArrowRight':
            navigateSlide(1);
            break;
          case 'Home':
            goToSlide(0);
            break;
          case 'End':
            goToSlide(totalSlides - 1);
            break;
          case 'Escape':
            window.close();
            break;
        }
      });
      
      // Interactive functions from main app
      function switchTab(button, index) {
        const container = button.closest('.tabs');
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
        const container = element.closest('.multiple-choice');
        const options = container.querySelectorAll('.option-item');
        const feedback = container.querySelector('.feedback-container');
        
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
        
        if (feedback) {
          feedback.style.display = 'block';
        }
      }

      // Auto-play functionality (optional)
      let autoPlayInterval = null;
      
      function startAutoPlay(intervalMs = 5000) {
        stopAutoPlay();
        autoPlayInterval = setInterval(() => {
          if (currentSlide < totalSlides - 1) {
            navigateSlide(1);
          } else {
            stopAutoPlay();
          }
        }, intervalMs);
      }
      
      function stopAutoPlay() {
        if (autoPlayInterval) {
          clearInterval(autoPlayInterval);
          autoPlayInterval = null;
        }
      }

      // Show help on F1
      document.addEventListener('keydown', (e) => {
        if (e.key === 'F1') {
          e.preventDefault();
          alert('Course Preview Help:\\n\\nNavigation:\\n- Left/Right arrows: Navigate slides\\n- Home/End: Go to first/last slide\\n- Escape: Close preview\\n\\nMouse:\\n- Click navigation buttons or dots\\n- Click on interactive elements');
        }
      });

      console.log('Course preview loaded with', totalSlides, 'slides');
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

// Make available globally
window.coursePreviewController = null;
