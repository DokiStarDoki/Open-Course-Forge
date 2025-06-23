/**
 * Course Forge MVP - Slide Content Renderer
 * Renders different slide types with their generated content
 */

class SlideRenderer {
  constructor() {
    this.renderers = new Map();
    this.initializeRenderers();

    if (CONFIG.DEBUG.ENABLED) {
      console.log("SlideRenderer initialized");
    }
  }

  /**
   * Initialize all slide type renderers
   */
  initializeRenderers() {
    this.renderers.set("textAndImage", this.renderTextAndImage.bind(this));
    this.renderers.set("textAndBullets", this.renderTextAndBullets.bind(this));
    this.renderers.set(
      "iconsWithTitles",
      this.renderIconsWithTitles.bind(this)
    );
    this.renderers.set("multipleChoice", this.renderMultipleChoice.bind(this));
    this.renderers.set("tabs", this.renderTabs.bind(this));
    this.renderers.set("flipCards", this.renderFlipCards.bind(this));
    this.renderers.set("faq", this.renderFaq.bind(this));
    this.renderers.set("popups", this.renderPopups.bind(this));
  }

  /**
   * Render a slide based on its type and content
   */
  renderSlide(chunk, isEditable = false) {
    if (!chunk.generatedContent) {
      return this.renderEmptySlide(chunk, isEditable);
    }

    const renderer = this.renderers.get(chunk.slideType);
    if (!renderer) {
      return this.renderUnsupportedSlide(chunk);
    }

    try {
      return renderer(chunk, isEditable);
    } catch (error) {
      console.error(`Error rendering slide ${chunk.id}:`, error);
      return this.renderErrorSlide(chunk, error);
    }
  }

  /**
   * Render text and image slide
   */
  renderTextAndImage(chunk, isEditable) {
    const content = chunk.generatedContent;

    return `
            <div class="slide-content text-and-image" data-slide-type="textAndImage">
                <div class="slide-header">
                    <h2 class="slide-title" ${
                      isEditable ? 'contenteditable="true"' : ""
                    } 
                        data-field="header">${this.escapeHtml(
                          content.header || chunk.title
                        )}</h2>
                </div>
                <div class="slide-body">
                    <div class="content-section">
                        <div class="text-content" ${
                          isEditable ? 'contenteditable="true"' : ""
                        } 
                             data-field="text">${this.escapeHtml(
                               content.text || ""
                             )}</div>
                    </div>
                    <div class="image-section">
                        <img src="${
                          content.image ||
                          "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&h=300&fit=crop"
                        }" 
                             alt="${this.escapeHtml(
                               content.header || chunk.title
                             )}" 
                             class="slide-image"
                             loading="lazy">
                        ${
                          isEditable
                            ? `<input type="url" class="image-url-input" value="${
                                content.image || ""
                              }" data-field="image" placeholder="Image URL">`
                            : ""
                        }
                    </div>
                </div>
                ${this.renderAudioScript(content.audioScript, isEditable)}
            </div>
        `;
  }

  /**
   * Render text and bullets slide
   */
  renderTextAndBullets(chunk, isEditable) {
    const content = chunk.generatedContent;

    return `
            <div class="slide-content text-and-bullets" data-slide-type="textAndBullets">
                <div class="slide-header">
                    <h2 class="slide-title" ${
                      isEditable ? 'contenteditable="true"' : ""
                    } 
                        data-field="header">${this.escapeHtml(
                          content.header || chunk.title
                        )}</h2>
                </div>
                <div class="slide-body">
                    <div class="text-content" ${
                      isEditable ? 'contenteditable="true"' : ""
                    } 
                         data-field="text">${this.escapeHtml(
                           content.text || ""
                         )}</div>
                    <ul class="bullet-list">
                        ${(content.bullets || [])
                          .map(
                            (bullet, index) => `
                            <li class="bullet-item" ${
                              isEditable ? 'contenteditable="true"' : ""
                            } 
                                data-field="bullets.${index}">${this.escapeHtml(
                              bullet
                            )}</li>
                        `
                          )
                          .join("")}
                        ${
                          isEditable
                            ? '<li class="bullet-item add-bullet" onclick="slideRenderer.addBulletPoint(this)">+ Add bullet point</li>'
                            : ""
                        }
                    </ul>
                </div>
                ${this.renderAudioScript(content.audioScript, isEditable)}
            </div>
        `;
  }

  /**
   * Render icons with titles slide
   */
  renderIconsWithTitles(chunk, isEditable) {
    const content = chunk.generatedContent;

    return `
            <div class="slide-content icons-with-titles" data-slide-type="iconsWithTitles">
                <div class="slide-header">
                    <h2 class="slide-title" ${
                      isEditable ? 'contenteditable="true"' : ""
                    } 
                        data-field="header">${this.escapeHtml(
                          content.header || chunk.title
                        )}</h2>
                </div>
                <div class="slide-body">
                    <div class="icons-grid">
                        ${(content.icons || [])
                          .map(
                            (icon, index) => `
                            <div class="icon-item">
                                <div class="icon-container">
                                    <i data-lucide="${
                                      icon.icon || "circle"
                                    }" class="icon"></i>
                                </div>
                                <h3 class="icon-title" ${
                                  isEditable ? 'contenteditable="true"' : ""
                                } 
                                    data-field="icons.${index}.title">${this.escapeHtml(
                              icon.title || ""
                            )}</h3>
                                <p class="icon-description" ${
                                  isEditable ? 'contenteditable="true"' : ""
                                } 
                                   data-field="icons.${index}.description">${this.escapeHtml(
                              icon.description || ""
                            )}</p>
                            </div>
                        `
                          )
                          .join("")}
                    </div>
                </div>
                ${this.renderAudioScript(content.audioScript, isEditable)}
            </div>
        `;
  }

  /**
   * Render multiple choice slide
   */
  renderMultipleChoice(chunk, isEditable) {
    const content = chunk.generatedContent;

    return `
            <div class="slide-content multiple-choice" data-slide-type="multipleChoice">
                <div class="slide-header">
                    <h2 class="slide-title">Knowledge Check</h2>
                </div>
                <div class="slide-body">
                    <div class="question-text" ${
                      isEditable ? 'contenteditable="true"' : ""
                    } 
                         data-field="question">${this.escapeHtml(
                           content.question || ""
                         )}</div>
                    <div class="options-container">
                        ${(content.options || [])
                          .map(
                            (option, index) => `
                            <div class="option-item ${
                              index === content.correctAnswer
                                ? "correct-answer"
                                : ""
                            }" 
                                 onclick="slideRenderer.selectOption(this, ${index}, ${
                              content.correctAnswer
                            })">
                                <div class="option-label">${String.fromCharCode(
                                  65 + index
                                )}</div>
                                <div class="option-text" ${
                                  isEditable ? 'contenteditable="true"' : ""
                                } 
                                     data-field="options.${index}">${this.escapeHtml(
                              option
                            )}</div>
                            </div>
                        `
                          )
                          .join("")}
                    </div>
                    <div class="feedback-container" style="display: none;">
                        <div class="feedback-text"></div>
                    </div>
                    ${
                      isEditable
                        ? `
                        <div class="correct-answer-selector">
                            <label>Correct Answer: 
                                <select data-field="correctAnswer">
                                    ${(content.options || [])
                                      .map(
                                        (_, index) => `
                                        <option value="${index}" ${
                                          index === content.correctAnswer
                                            ? "selected"
                                            : ""
                                        }>
                                            ${String.fromCharCode(65 + index)}
                                        </option>
                                    `
                                      )
                                      .join("")}
                                </select>
                            </label>
                        </div>
                    `
                        : ""
                    }
                </div>
                ${this.renderAudioScript(content.audioScript, isEditable)}
            </div>
        `;
  }

  /**
   * Render tabs slide
   */
  renderTabs(chunk, isEditable) {
    const content = chunk.generatedContent;

    if (!Array.isArray(content)) {
      return this.renderErrorSlide(
        chunk,
        new Error("Invalid tabs content format")
      );
    }

    return `
            <div class="slide-content tabs" data-slide-type="tabs">
                <div class="slide-header">
                    <h2 class="slide-title">${this.escapeHtml(chunk.title)}</h2>
                </div>
                <div class="slide-body">
                    <div class="tabs-container">
                        <div class="tab-buttons">
                            ${content
                              .map(
                                (tab, index) => `
                                <button class="tab-button ${
                                  index === 0 ? "active" : ""
                                }" 
                                        onclick="slideRenderer.switchTab(this, ${index})"
                                        ${
                                          isEditable
                                            ? 'contenteditable="true"'
                                            : ""
                                        } 
                                        data-field="${index}.title">${this.escapeHtml(
                                  tab.title || `Tab ${index + 1}`
                                )}</button>
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
                                    <div class="tab-text" ${
                                      isEditable ? 'contenteditable="true"' : ""
                                    } 
                                         data-field="${index}.content">${this.escapeHtml(
                                  tab.content || ""
                                )}</div>
                                </div>
                            `
                              )
                              .join("")}
                        </div>
                    </div>
                </div>
            </div>
        `;
  }

  /**
   * Render flip cards slide
   */
  renderFlipCards(chunk, isEditable) {
    const content = chunk.generatedContent;

    if (!Array.isArray(content)) {
      return this.renderErrorSlide(
        chunk,
        new Error("Invalid flip cards content format")
      );
    }

    return `
            <div class="slide-content flip-cards" data-slide-type="flipCards">
                <div class="slide-header">
                    <h2 class="slide-title">${this.escapeHtml(chunk.title)}</h2>
                </div>
                <div class="slide-body">
                    <div class="cards-grid">
                        ${content
                          .map(
                            (card, index) => `
                            <div class="flip-card" onclick="slideRenderer.flipCard(this)">
                                <div class="flip-card-inner">
                                    <div class="flip-card-front">
                                        <div class="card-content" ${
                                          isEditable
                                            ? 'contenteditable="true"'
                                            : ""
                                        } 
                                             data-field="${index}.front">${this.escapeHtml(
                              card.front || ""
                            )}</div>
                                    </div>
                                    <div class="flip-card-back">
                                        <div class="card-content" ${
                                          isEditable
                                            ? 'contenteditable="true"'
                                            : ""
                                        } 
                                             data-field="${index}.back">${this.escapeHtml(
                              card.back || ""
                            )}</div>
                                    </div>
                                </div>
                            </div>
                        `
                          )
                          .join("")}
                    </div>
                </div>
            </div>
        `;
  }

  /**
   * Render FAQ slide
   */
  renderFaq(chunk, isEditable) {
    const content = chunk.generatedContent;

    return `
            <div class="slide-content faq" data-slide-type="faq">
                <div class="slide-header">
                    <h2 class="slide-title" ${
                      isEditable ? 'contenteditable="true"' : ""
                    } 
                        data-field="header">${this.escapeHtml(
                          content.header || chunk.title
                        )}</h2>
                </div>
                <div class="slide-body">
                    <div class="faq-container">
                        ${(content.items || [])
                          .map(
                            (item, index) => `
                            <div class="faq-item">
                                <div class="faq-question" onclick="slideRenderer.toggleFaq(this)">
                                    <span class="question-text" ${
                                      isEditable ? 'contenteditable="true"' : ""
                                    } 
                                          data-field="items.${index}.question">${this.escapeHtml(
                              item.question || ""
                            )}</span>
                                    <i data-lucide="chevron-down" class="faq-icon"></i>
                                </div>
                                <div class="faq-answer">
                                    <div class="answer-text" ${
                                      isEditable ? 'contenteditable="true"' : ""
                                    } 
                                         data-field="items.${index}.answer">${this.escapeHtml(
                              item.answer || ""
                            )}</div>
                                </div>
                            </div>
                        `
                          )
                          .join("")}
                    </div>
                </div>
                ${this.renderAudioScript(content.audioScript, isEditable)}
            </div>
        `;
  }

  /**
   * Render popups slide
   */
  renderPopups(chunk, isEditable) {
    const content = chunk.generatedContent;

    if (!Array.isArray(content)) {
      return this.renderErrorSlide(
        chunk,
        new Error("Invalid popups content format")
      );
    }

    return `
            <div class="slide-content popups" data-slide-type="popups">
                <div class="slide-header">
                    <h2 class="slide-title">${this.escapeHtml(chunk.title)}</h2>
                </div>
                <div class="slide-body">
                    <div class="popups-container">
                        ${content
                          .map(
                            (popup, index) => `
                            <div class="popup-trigger" onclick="slideRenderer.openPopup(this, ${index})">
                                <i data-lucide="info"></i>
                                <span class="popup-title" ${
                                  isEditable ? 'contenteditable="true"' : ""
                                } 
                                      data-field="${index}.title">${this.escapeHtml(
                              popup.title || ""
                            )}</span>
                            </div>
                        `
                          )
                          .join("")}
                    </div>
                    
                    <!-- Popup Modals -->
                    ${content
                      .map(
                        (popup, index) => `
                        <div class="popup-modal" id="popup-${index}" style="display: none;">
                            <div class="popup-content">
                                <div class="popup-header">
                                    <h3>${this.escapeHtml(
                                      popup.title || ""
                                    )}</h3>
                                    <button class="popup-close" onclick="slideRenderer.closePopup(${index})">×</button>
                                </div>
                                <div class="popup-body" ${
                                  isEditable ? 'contenteditable="true"' : ""
                                } 
                                     data-field="${index}.content">${this.escapeHtml(
                          popup.content || ""
                        )}</div>
                            </div>
                        </div>
                    `
                      )
                      .join("")}
                </div>
            </div>
        `;
  }

  /**
   * Render audio script section
   */
  renderAudioScript(audioScript, isEditable) {
    if (!audioScript && !isEditable) return "";

    return `
            <div class="audio-script-section">
                <div class="audio-script-header">
                    <i data-lucide="volume-2"></i>
                    <span>Audio Script</span>
                </div>
                <div class="audio-script-content" ${
                  isEditable ? 'contenteditable="true"' : ""
                } 
                     data-field="audioScript">${this.escapeHtml(
                       audioScript || "No audio script provided"
                     )}</div>
            </div>
        `;
  }

  /**
   * Render empty slide (no content generated yet)
   */
  renderEmptySlide(chunk, isEditable) {
    return `
            <div class="slide-content empty-slide">
                <div class="slide-header">
                    <h2 class="slide-title">${this.escapeHtml(chunk.title)}</h2>
                    <span class="slide-type-badge">${this.getSlideTypeLabel(
                      chunk.slideType
                    )}</span>
                </div>
                <div class="slide-body">
                    <div class="empty-state">
                        <i data-lucide="sparkles" class="empty-icon"></i>
                        <p>Content not generated yet</p>
                        <p class="empty-hint">Click "Generate Content" to create AI-generated content for this slide</p>
                    </div>
                </div>
            </div>
        `;
  }

  /**
   * Render unsupported slide type
   */
  renderUnsupportedSlide(chunk) {
    return `
            <div class="slide-content error-slide">
                <div class="slide-header">
                    <h2 class="slide-title">${this.escapeHtml(chunk.title)}</h2>
                </div>
                <div class="slide-body">
                    <div class="error-state">
                        <i data-lucide="alert-triangle" class="error-icon"></i>
                        <p>Unsupported slide type: ${chunk.slideType}</p>
                    </div>
                </div>
            </div>
        `;
  }

  /**
   * Render error slide
   */
  renderErrorSlide(chunk, error) {
    return `
            <div class="slide-content error-slide">
                <div class="slide-header">
                    <h2 class="slide-title">${this.escapeHtml(chunk.title)}</h2>
                </div>
                <div class="slide-body">
                    <div class="error-state">
                        <i data-lucide="alert-triangle" class="error-icon"></i>
                        <p>Error rendering slide: ${this.escapeHtml(
                          error.message
                        )}</p>
                    </div>
                </div>
            </div>
        `;
  }

  /**
   * Interactive methods for slide functionality
   */

  selectOption(element, selectedIndex, correctIndex) {
    const container = element.closest(".multiple-choice");
    const options = container.querySelectorAll(".option-item");
    const feedback = container.querySelector(".feedback-container");
    const feedbackText = container.querySelector(".feedback-text");

    // Remove previous selections
    options.forEach((opt) =>
      opt.classList.remove("selected", "correct", "incorrect")
    );

    // Mark selected option
    element.classList.add("selected");

    // Show correct/incorrect feedback
    if (selectedIndex === correctIndex) {
      element.classList.add("correct");
      feedbackText.textContent = "Correct! Well done.";
      feedbackText.className = "feedback-text correct";
    } else {
      element.classList.add("incorrect");
      options[correctIndex].classList.add("correct");
      feedbackText.textContent =
        "Not quite right. The correct answer is highlighted.";
      feedbackText.className = "feedback-text incorrect";
    }

    feedback.style.display = "block";
  }

  switchTab(button, index) {
    const container = button.closest(".tabs");
    const buttons = container.querySelectorAll(".tab-button");
    const panels = container.querySelectorAll(".tab-panel");

    buttons.forEach((btn) => btn.classList.remove("active"));
    panels.forEach((panel) => panel.classList.remove("active"));

    button.classList.add("active");
    panels[index].classList.add("active");
  }

  flipCard(card) {
    card.classList.toggle("flipped");
  }

  toggleFaq(question) {
    const item = question.parentElement;
    const answer = item.querySelector(".faq-answer");
    const icon = question.querySelector(".faq-icon");

    item.classList.toggle("open");

    if (item.classList.contains("open")) {
      answer.style.display = "block";
      icon.style.transform = "rotate(180deg)";
    } else {
      answer.style.display = "none";
      icon.style.transform = "rotate(0deg)";
    }
  }

  openPopup(trigger, index) {
    const popup = document.getElementById(`popup-${index}`);
    if (popup) {
      popup.style.display = "flex";
    }
  }

  closePopup(index) {
    const popup = document.getElementById(`popup-${index}`);
    if (popup) {
      popup.style.display = "none";
    }
  }

  addBulletPoint(element) {
    const newBullet = document.createElement("li");
    newBullet.className = "bullet-item";
    newBullet.contentEditable = true;
    newBullet.textContent = "New bullet point";

    element.parentElement.insertBefore(newBullet, element);
    newBullet.focus();
  }

  /**
   * Utility methods
   */

  escapeHtml(text) {
    if (typeof text !== "string") return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  getSlideTypeLabel(slideType) {
    const slideTypeMap = new Map(
      CONFIG.SLIDE_TYPES.map((type) => [type.value, type.label])
    );
    return slideTypeMap.get(slideType) || slideType;
  }
}

// Create global instance
window.slideRenderer = new SlideRenderer();
