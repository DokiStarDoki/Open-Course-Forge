/**
 * Course Forge MVP - Interactive Slide Components
 * Renders editable, interactive slide content
 */

class SlideComponents {
  constructor() {
    this.editingChunk = null;
    this.editingField = null;
    this.app = null; // Will be set by main app
  }

  /**
   * Render a slide component based on type
   */
  renderSlideComponent(chunk, isEditable = true) {
    const { slideType, generatedContent } = chunk;

    if (!generatedContent) {
      return this.renderEmptyState(chunk, isEditable);
    }

    const componentId = `slide-${chunk.id}`;
    const editClass = isEditable ? "editable" : "readonly";

    switch (slideType) {
      case "title":
        return this.renderTitleSlide(chunk, componentId, editClass);
      case "courseInfo":
        return this.renderCourseInfoSlide(chunk, componentId, editClass);
      case "textAndBullets":
        return this.renderTextAndBullets(chunk, componentId, editClass);
      case "textAndImage":
        return this.renderTextAndImage(chunk, componentId, editClass);
      case "multipleChoice":
        return this.renderMultipleChoice(chunk, componentId, editClass);
      case "iconsWithTitles":
        return this.renderIconsWithTitles(chunk, componentId, editClass);
      case "tabs":
        return this.renderTabs(chunk, componentId, editClass);
      case "flipCards":
        return this.renderFlipCards(chunk, componentId, editClass);
      case "faq":
        return this.renderFAQ(chunk, componentId, editClass);
      case "popups":
        return this.renderPopups(chunk, componentId, editClass);
      default:
        return this.renderGenericSlide(chunk, componentId, editClass);
    }
  }

  renderEmptyState(chunk, isEditable) {
    return `
      <div class="slide-empty-state">
        <p class="text-muted">No slide content generated yet</p>
        ${
          isEditable
            ? `
          <button class="btn btn-primary btn-sm" onclick="slideComponents.generateContent('${chunk.id}')">
            Generate Content
          </button>
        `
            : ""
        }
      </div>
    `;
  }

  renderTitleSlide(chunk, componentId, editClass) {
    const content = chunk.generatedContent;
    return `
      <div class="slide-component title-slide ${editClass}" id="${componentId}">
        <div class="slide-header">
          <h2 class="slide-title editable-text" 
              contenteditable="${editClass === "editable"}"
              onblur="slideComponents.updateContent('${
                chunk.id
              }', 'header', this.textContent)">
            ${this.escapeHtml(content.header || "")}
          </h2>
        </div>
        <div class="slide-content">
          <p class="slide-text editable-text" 
             contenteditable="${editClass === "editable"}"
             onblur="slideComponents.updateContent('${
               chunk.id
             }', 'text', this.textContent)">
            ${this.escapeHtml(content.text || "")}
          </p>
        </div>
        ${
          editClass === "editable"
            ? this.renderEditControls(chunk.id, "title")
            : ""
        }
      </div>
    `;
  }

  renderCourseInfoSlide(chunk, componentId, editClass) {
    const content = chunk.generatedContent;
    return `
      <div class="slide-component course-info-slide ${editClass}" id="${componentId}">
        <div class="slide-header">
          <h2 class="slide-title editable-text" 
              contenteditable="${editClass === "editable"}"
              onblur="slideComponents.updateContent('${
                chunk.id
              }', 'header', this.textContent)">
            ${this.escapeHtml(content.header || "")}
          </h2>
        </div>
        <div class="slide-content">
          <p class="slide-text editable-text" 
             contenteditable="${editClass === "editable"}"
             onblur="slideComponents.updateContent('${
               chunk.id
             }', 'text', this.textContent)">
            ${this.escapeHtml(content.text || "")}
          </p>
          <div class="course-meta">
            <div class="meta-item">
              <strong>Duration:</strong> 
              <span class="editable-text" 
                    contenteditable="${editClass === "editable"}"
                    onblur="slideComponents.updateContent('${
                      chunk.id
                    }', 'duration', this.textContent)">
                ${this.escapeHtml(content.duration || "")}
              </span>
            </div>
            ${
              content.objectives
                ? `
              <div class="meta-item">
                <strong>Objectives:</strong>
                <ul class="objectives-list">
                  ${content.objectives
                    .map(
                      (obj, index) => `
                    <li class="editable-text" 
                        contenteditable="${editClass === "editable"}"
                        onblur="slideComponents.updateObjective('${
                          chunk.id
                        }', ${index}, this.textContent)">
                      ${this.escapeHtml(obj)}
                    </li>
                  `
                    )
                    .join("")}
                </ul>
                ${
                  editClass === "editable"
                    ? `
                  <button class="btn btn-sm btn-outline-primary" 
                          onclick="slideComponents.addObjective('${chunk.id}')">
                    Add Objective
                  </button>
                `
                    : ""
                }
              </div>
            `
                : ""
            }
          </div>
        </div>
        ${
          editClass === "editable"
            ? this.renderEditControls(chunk.id, "courseInfo")
            : ""
        }
      </div>
    `;
  }

  renderTextAndBullets(chunk, componentId, editClass) {
    const content = chunk.generatedContent;
    const bullets = content.bullets || [];

    return `
      <div class="slide-component text-bullets-slide ${editClass}" id="${componentId}">
        <div class="slide-header">
          <h2 class="slide-title editable-text" 
              contenteditable="${editClass === "editable"}"
              onblur="slideComponents.updateContent('${
                chunk.id
              }', 'header', this.textContent)">
            ${this.escapeHtml(content.header || "")}
          </h2>
        </div>
        <div class="slide-content">
          <p class="slide-text editable-text" 
             contenteditable="${editClass === "editable"}"
             onblur="slideComponents.updateContent('${
               chunk.id
             }', 'text', this.textContent)">
            ${this.escapeHtml(content.text || "")}
          </p>
          <ul class="bullet-list">
            ${bullets
              .map(
                (bullet, index) => `
              <li class="bullet-item">
                <span class="editable-text" 
                      contenteditable="${editClass === "editable"}"
                      onblur="slideComponents.updateBullet('${
                        chunk.id
                      }', ${index}, this.textContent)">
                  ${this.escapeHtml(bullet)}
                </span>
                ${
                  editClass === "editable"
                    ? `
                  <button class="btn btn-sm btn-outline-danger delete-bullet" 
                          onclick="slideComponents.deleteBullet('${chunk.id}', ${index})">
                    ×
                  </button>
                `
                    : ""
                }
              </li>
            `
              )
              .join("")}
          </ul>
          ${
            editClass === "editable"
              ? `
            <button class="btn btn-sm btn-outline-primary" 
                    onclick="slideComponents.addBullet('${chunk.id}')">
              Add Bullet Point
            </button>
          `
              : ""
          }
        </div>
        ${
          editClass === "editable"
            ? this.renderEditControls(chunk.id, "textAndBullets")
            : ""
        }
      </div>
    `;
  }

  renderTextAndImage(chunk, componentId, editClass) {
    const content = chunk.generatedContent;
    return `
      <div class="slide-component text-image-slide ${editClass}" id="${componentId}">
        <div class="slide-header">
          <h2 class="slide-title editable-text" 
              contenteditable="${editClass === "editable"}"
              onblur="slideComponents.updateContent('${
                chunk.id
              }', 'header', this.textContent)">
            ${this.escapeHtml(content.header || "")}
          </h2>
        </div>
        <div class="slide-content">
          <div class="text-image-layout">
            <div class="text-section">
              <p class="slide-text editable-text" 
                 contenteditable="${editClass === "editable"}"
                 onblur="slideComponents.updateContent('${
                   chunk.id
                 }', 'text', this.textContent)">
                ${this.escapeHtml(content.text || "")}
              </p>
            </div>
            <div class="image-section">
              <div class="image-placeholder">
                <div class="image-description editable-text" 
                     contenteditable="${editClass === "editable"}"
                     onblur="slideComponents.updateContent('${
                       chunk.id
                     }', 'image', this.textContent)">
                  ${this.escapeHtml(content.image || "Image description")}
                </div>
                <div class="image-icon">🖼️</div>
              </div>
            </div>
          </div>
        </div>
        ${
          editClass === "editable"
            ? this.renderEditControls(chunk.id, "textAndImage")
            : ""
        }
      </div>
    `;
  }

  renderMultipleChoice(chunk, componentId, editClass) {
    const content = chunk.generatedContent;
    const options = content.options || [];
    const correctAnswer = content.correctAnswer || 0;

    return `
      <div class="slide-component multiple-choice-slide ${editClass}" id="${componentId}">
        <div class="slide-content">
          <div class="question-section">
            <h3 class="question-text editable-text" 
                contenteditable="${editClass === "editable"}"
                onblur="slideComponents.updateContent('${
                  chunk.id
                }', 'question', this.textContent)">
              ${this.escapeHtml(content.question || "")}
            </h3>
          </div>
          <div class="options-section">
            ${options
              .map(
                (option, index) => `
              <div class="option-item ${
                index === correctAnswer ? "correct" : ""
              }">
                <div class="option-marker">
                  <input type="radio" 
                         name="quiz-${chunk.id}" 
                         ${
                           editClass === "editable"
                             ? `onchange="slideComponents.setCorrectAnswer('${chunk.id}', ${index})"`
                             : ""
                         }
                         ${index === correctAnswer ? "checked" : ""}>
                  <label>${String.fromCharCode(65 + index)}</label>
                </div>
                <div class="option-text editable-text" 
                     contenteditable="${editClass === "editable"}"
                     onblur="slideComponents.updateOption('${
                       chunk.id
                     }', ${index}, this.textContent)">
                  ${this.escapeHtml(option)}
                </div>
                ${
                  editClass === "editable"
                    ? `
                  <button class="btn btn-sm btn-outline-danger delete-option" 
                          onclick="slideComponents.deleteOption('${chunk.id}', ${index})">
                    ×
                  </button>
                `
                    : ""
                }
              </div>
            `
              )
              .join("")}
            ${
              editClass === "editable"
                ? `
              <button class="btn btn-sm btn-outline-primary" 
                      onclick="slideComponents.addOption('${chunk.id}')">
                Add Option
              </button>
            `
                : ""
            }
          </div>
          ${
            content.feedback
              ? `
            <div class="feedback-section">
              <div class="feedback-item">
                <strong>Correct Answer:</strong>
                <p class="editable-text" 
                   contenteditable="${editClass === "editable"}"
                   onblur="slideComponents.updateFeedback('${
                     chunk.id
                   }', 'correct', this.textContent)">
                  ${this.escapeHtml(content.feedback.correct || "")}
                </p>
              </div>
              <div class="feedback-item">
                <strong>Incorrect Answer:</strong>
                <p class="editable-text" 
                   contenteditable="${editClass === "editable"}"
                   onblur="slideComponents.updateFeedback('${
                     chunk.id
                   }', 'incorrect', this.textContent)">
                  ${this.escapeHtml(content.feedback.incorrect || "")}
                </p>
              </div>
            </div>
          `
              : ""
          }
        </div>
        ${
          editClass === "editable"
            ? this.renderEditControls(chunk.id, "multipleChoice")
            : ""
        }
      </div>
    `;
  }

  renderFlipCards(chunk, componentId, editClass) {
    const content = chunk.generatedContent;
    const cards = Array.isArray(content) ? content : [];

    return `
      <div class="slide-component flip-cards-slide ${editClass}" id="${componentId}">
        <div class="slide-content">
          <div class="flip-cards-container">
            ${cards
              .map(
                (card, index) => `
              <div class="flip-card" onclick="slideComponents.flipCard('${
                chunk.id
              }', ${index})">
                <div class="flip-card-inner" id="flip-card-${
                  chunk.id
                }-${index}">
                  <div class="flip-card-front">
                    <div class="card-content editable-text" 
                         contenteditable="${editClass === "editable"}"
                         onblur="slideComponents.updateCard('${
                           chunk.id
                         }', ${index}, 'front', this.textContent)"
                         onclick="event.stopPropagation()">
                      ${this.escapeHtml(card.front || "")}
                    </div>
                  </div>
                  <div class="flip-card-back">
                    <div class="card-content editable-text" 
                         contenteditable="${editClass === "editable"}"
                         onblur="slideComponents.updateCard('${
                           chunk.id
                         }', ${index}, 'back', this.textContent)"
                         onclick="event.stopPropagation()">
                      ${this.escapeHtml(card.back || "")}
                    </div>
                  </div>
                </div>
                ${
                  editClass === "editable"
                    ? `
                  <button class="btn btn-sm btn-outline-danger delete-card" 
                          onclick="event.stopPropagation(); slideComponents.deleteCard('${chunk.id}', ${index})">
                    ×
                  </button>
                `
                    : ""
                }
              </div>
            `
              )
              .join("")}
            ${
              editClass === "editable"
                ? `
              <div class="flip-card add-card" onclick="slideComponents.addCard('${chunk.id}')">
                <div class="flip-card-inner">
                  <div class="flip-card-front">
                    <div class="card-content add-card-content">
                      <span class="add-icon">+</span>
                      <span>Add Card</span>
                    </div>
                  </div>
                </div>
              </div>
            `
                : ""
            }
          </div>
        </div>
        ${
          editClass === "editable"
            ? this.renderEditControls(chunk.id, "flipCards")
            : ""
        }
      </div>
    `;
  }

  renderTabs(chunk, componentId, editClass) {
    const content = chunk.generatedContent;
    const tabs = Array.isArray(content) ? content : [];

    return `
      <div class="slide-component tabs-slide ${editClass}" id="${componentId}">
        <div class="slide-content">
          <div class="tabs-container">
            <div class="tab-headers">
              ${tabs
                .map(
                  (tab, index) => `
                <button class="tab-header ${index === 0 ? "active" : ""}" 
                        onclick="slideComponents.switchTab('${
                          chunk.id
                        }', ${index})">
                  <span class="editable-text" 
                        contenteditable="${editClass === "editable"}"
                        onblur="slideComponents.updateTab('${
                          chunk.id
                        }', ${index}, 'title', this.textContent)">
                    ${this.escapeHtml(tab.title || "")}
                  </span>
                  ${
                    editClass === "editable"
                      ? `
                    <button class="btn btn-sm btn-outline-danger delete-tab" 
                            onclick="event.stopPropagation(); slideComponents.deleteTab('${chunk.id}', ${index})">
                      ×
                    </button>
                  `
                      : ""
                  }
                </button>
              `
                )
                .join("")}
              ${
                editClass === "editable"
                  ? `
                <button class="tab-header add-tab" 
                        onclick="slideComponents.addTab('${chunk.id}')">
                  + Add Tab
                </button>
              `
                  : ""
              }
            </div>
            <div class="tab-content">
              ${tabs
                .map(
                  (tab, index) => `
                <div class="tab-panel ${index === 0 ? "active" : ""}" 
                     id="tab-${chunk.id}-${index}">
                  <div class="tab-text editable-text" 
                       contenteditable="${editClass === "editable"}"
                       onblur="slideComponents.updateTab('${
                         chunk.id
                       }', ${index}, 'content', this.textContent)">
                    ${this.escapeHtml(tab.content || "")}
                  </div>
                </div>
              `
                )
                .join("")}
            </div>
          </div>
        </div>
        ${
          editClass === "editable"
            ? this.renderEditControls(chunk.id, "tabs")
            : ""
        }
      </div>
    `;
  }

  renderIconsWithTitles(chunk, componentId, editClass) {
    const content = chunk.generatedContent;
    const icons = content.icons || [];

    return `
      <div class="slide-component icons-slide ${editClass}" id="${componentId}">
        <div class="slide-header">
          <h2 class="slide-title editable-text" 
              contenteditable="${editClass === "editable"}"
              onblur="slideComponents.updateContent('${
                chunk.id
              }', 'header', this.textContent)">
            ${this.escapeHtml(content.header || "")}
          </h2>
        </div>
        <div class="slide-content">
          <div class="icons-grid">
            ${icons
              .map(
                (icon, index) => `
              <div class="icon-item">
                <div class="icon-symbol editable-text" 
                     contenteditable="${editClass === "editable"}"
                     onblur="slideComponents.updateIcon('${
                       chunk.id
                     }', ${index}, 'icon', this.textContent)">
                  ${this.escapeHtml(icon.icon || "📋")}
                </div>
                <h4 class="icon-title editable-text" 
                    contenteditable="${editClass === "editable"}"
                    onblur="slideComponents.updateIcon('${
                      chunk.id
                    }', ${index}, 'title', this.textContent)">
                  ${this.escapeHtml(icon.title || "")}
                </h4>
                <p class="icon-description editable-text" 
                   contenteditable="${editClass === "editable"}"
                   onblur="slideComponents.updateIcon('${
                     chunk.id
                   }', ${index}, 'description', this.textContent)">
                  ${this.escapeHtml(icon.description || "")}
                </p>
                ${
                  editClass === "editable"
                    ? `
                  <button class="btn btn-sm btn-outline-danger delete-icon" 
                          onclick="slideComponents.deleteIcon('${chunk.id}', ${index})">
                    ×
                  </button>
                `
                    : ""
                }
              </div>
            `
              )
              .join("")}
            ${
              editClass === "editable"
                ? `
              <div class="icon-item add-icon" onclick="slideComponents.addIcon('${chunk.id}')">
                <div class="icon-symbol">+</div>
                <h4 class="icon-title">Add Icon</h4>
              </div>
            `
                : ""
            }
          </div>
        </div>
        ${
          editClass === "editable"
            ? this.renderEditControls(chunk.id, "iconsWithTitles")
            : ""
        }
      </div>
    `;
  }

  renderFAQ(chunk, componentId, editClass) {
    const content = chunk.generatedContent;
    const items = content.items || [];

    return `
      <div class="slide-component faq-slide ${editClass}" id="${componentId}">
        <div class="slide-header">
          <h2 class="slide-title editable-text" 
              contenteditable="${editClass === "editable"}"
              onblur="slideComponents.updateContent('${
                chunk.id
              }', 'header', this.textContent)">
            ${this.escapeHtml(content.header || "")}
          </h2>
        </div>
        <div class="slide-content">
          <div class="faq-items">
            ${items
              .map(
                (item, index) => `
              <div class="faq-item">
                <div class="faq-question" onclick="slideComponents.toggleFAQ('${
                  chunk.id
                }', ${index})">
                  <span class="editable-text" 
                        contenteditable="${editClass === "editable"}"
                        onblur="slideComponents.updateFAQItem('${
                          chunk.id
                        }', ${index}, 'question', this.textContent)"
                        onclick="event.stopPropagation()">
                    ${this.escapeHtml(item.question || "")}
                  </span>
                  <span class="faq-toggle">▼</span>
                  ${
                    editClass === "editable"
                      ? `
                    <button class="btn btn-sm btn-outline-danger delete-faq" 
                            onclick="event.stopPropagation(); slideComponents.deleteFAQItem('${chunk.id}', ${index})">
                      ×
                    </button>
                  `
                      : ""
                  }
                </div>
                <div class="faq-answer" id="faq-${chunk.id}-${index}">
                  <p class="editable-text" 
                     contenteditable="${editClass === "editable"}"
                     onblur="slideComponents.updateFAQItem('${
                       chunk.id
                     }', ${index}, 'answer', this.textContent)">
                    ${this.escapeHtml(item.answer || "")}
                  </p>
                </div>
              </div>
            `
              )
              .join("")}
            ${
              editClass === "editable"
                ? `
              <button class="btn btn-sm btn-outline-primary" 
                      onclick="slideComponents.addFAQItem('${chunk.id}')">
                Add FAQ Item
              </button>
            `
                : ""
            }
          </div>
        </div>
        ${
          editClass === "editable"
            ? this.renderEditControls(chunk.id, "faq")
            : ""
        }
      </div>
    `;
  }

  renderPopups(chunk, componentId, editClass) {
    const content = chunk.generatedContent;
    const popups = Array.isArray(content) ? content : [];

    return `
      <div class="slide-component popups-slide ${editClass}" id="${componentId}">
        <div class="slide-content">
          <div class="popups-container">
            ${popups
              .map(
                (popup, index) => `
              <div class="popup-trigger" onclick="slideComponents.togglePopup('${
                chunk.id
              }', ${index})">
                <span class="editable-text" 
                      contenteditable="${editClass === "editable"}"
                      onblur="slideComponents.updatePopup('${
                        chunk.id
                      }', ${index}, 'title', this.textContent)"
                      onclick="event.stopPropagation()">
                  ${this.escapeHtml(popup.title || "")}
                </span>
                <span class="popup-icon">ℹ️</span>
                ${
                  editClass === "editable"
                    ? `
                  <button class="btn btn-sm btn-outline-danger delete-popup" 
                          onclick="event.stopPropagation(); slideComponents.deletePopup('${chunk.id}', ${index})">
                    ×
                  </button>
                `
                    : ""
                }
              </div>
              <div class="popup-content" id="popup-${chunk.id}-${index}">
                <div class="popup-text editable-text" 
                     contenteditable="${editClass === "editable"}"
                     onblur="slideComponents.updatePopup('${
                       chunk.id
                     }', ${index}, 'content', this.textContent)">
                  ${this.escapeHtml(popup.content || "")}
                </div>
              </div>
            `
              )
              .join("")}
            ${
              editClass === "editable"
                ? `
              <button class="btn btn-sm btn-outline-primary" 
                      onclick="slideComponents.addPopup('${chunk.id}')">
                Add Popup
              </button>
            `
                : ""
            }
          </div>
        </div>
        ${
          editClass === "editable"
            ? this.renderEditControls(chunk.id, "popups")
            : ""
        }
      </div>
    `;
  }

  renderGenericSlide(chunk, componentId, editClass) {
    const content = chunk.generatedContent;
    return `
      <div class="slide-component generic-slide ${editClass}" id="${componentId}">
        <div class="slide-content">
          <pre class="generic-content editable-text" 
               contenteditable="${editClass === "editable"}"
               onblur="slideComponents.updateGenericContent('${
                 chunk.id
               }', this.textContent)">
            ${this.escapeHtml(JSON.stringify(content, null, 2))}
          </pre>
        </div>
        ${
          editClass === "editable"
            ? this.renderEditControls(chunk.id, "generic")
            : ""
        }
      </div>
    `;
  }

  renderEditControls(chunkId, slideType) {
    return `
      <div class="slide-edit-controls">
        <button class="btn btn-sm btn-outline-secondary" 
                onclick="slideComponents.regenerateContent('${chunkId}')">
          🔄 Regenerate
        </button>
        <button class="btn btn-sm btn-outline-primary" 
                onclick="slideComponents.duplicateSlide('${chunkId}')">
          📋 Duplicate
        </button>
        <button class="btn btn-sm btn-outline-success" 
                onclick="slideComponents.previewSlide('${chunkId}')">
          👁️ Preview
        </button>
      </div>
    `;
  }

  // Interactive event handlers
  flipCard(chunkId, cardIndex) {
    const cardElement = document.getElementById(
      `flip-card-${chunkId}-${cardIndex}`
    );
    if (cardElement) {
      cardElement.classList.toggle("flipped");
    }
  }

  switchTab(chunkId, tabIndex) {
    // Hide all tab panels
    const tabPanels = document.querySelectorAll(`[id^="tab-${chunkId}-"]`);
    tabPanels.forEach((panel) => {
      panel.classList.remove("active");
    });

    // Show selected tab panel
    const selectedPanel = document.getElementById(`tab-${chunkId}-${tabIndex}`);
    if (selectedPanel) {
      selectedPanel.classList.add("active");
    }

    // Update tab header states
    const tabHeaders = document.querySelectorAll(
      `[onclick*="switchTab('${chunkId}',"]`
    );
    tabHeaders.forEach((header) => {
      header.classList.remove("active");
    });

    const selectedHeader = document.querySelector(
      `[onclick*="switchTab('${chunkId}', ${tabIndex})"]`
    );
    if (selectedHeader) {
      selectedHeader.classList.add("active");
    }
  }

  toggleFAQ(chunkId, itemIndex) {
    const faqAnswer = document.getElementById(`faq-${chunkId}-${itemIndex}`);
    if (faqAnswer) {
      faqAnswer.classList.toggle("open");
    }
  }

  togglePopup(chunkId, popupIndex) {
    const popup = document.getElementById(`popup-${chunkId}-${popupIndex}`);
    if (popup) {
      popup.classList.toggle("open");
    }
  }

  escapeHtml(text) {
    if (typeof text !== "string") return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // Content update methods - these will be connected to the main app
  updateContent(chunkId, field, value) {
    if (this.app && this.app.updateSlideContent) {
      this.app.updateSlideContent(chunkId, field, value);
    }
  }

  updateBullet(chunkId, index, value) {
    if (this.app && this.app.updateSlideBullet) {
      this.app.updateSlideBullet(chunkId, index, value);
    }
  }

  addBullet(chunkId) {
    if (this.app && this.app.addSlideBullet) {
      this.app.addSlideBullet(chunkId);
    }
  }

  deleteBullet(chunkId, index) {
    if (this.app && this.app.deleteSlideBullet) {
      this.app.deleteSlideBullet(chunkId, index);
    }
  }

  updateCard(chunkId, index, side, value) {
    if (this.app && this.app.updateSlideCard) {
      this.app.updateSlideCard(chunkId, index, side, value);
    }
  }

  addCard(chunkId) {
    if (this.app && this.app.addSlideCard) {
      this.app.addSlideCard(chunkId);
    }
  }

  deleteCard(chunkId, index) {
    if (this.app && this.app.deleteSlideCard) {
      this.app.deleteSlideCard(chunkId, index);
    }
  }

  updateTab(chunkId, index, field, value) {
    if (this.app && this.app.updateSlideTab) {
      this.app.updateSlideTab(chunkId, index, field, value);
    }
  }

  addTab(chunkId) {
    if (this.app && this.app.addSlideTab) {
      this.app.addSlideTab(chunkId);
    }
  }

  deleteTab(chunkId, index) {
    if (this.app && this.app.deleteSlideTab) {
      this.app.deleteSlideTab(chunkId, index);
    }
  }

  updateIcon(chunkId, index, field, value) {
    if (this.app && this.app.updateSlideIcon) {
      this.app.updateSlideIcon(chunkId, index, field, value);
    }
  }

  addIcon(chunkId) {
    if (this.app && this.app.addSlideIcon) {
      this.app.addSlideIcon(chunkId);
    }
  }

  deleteIcon(chunkId, index) {
    if (this.app && this.app.deleteSlideIcon) {
      this.app.deleteSlideIcon(chunkId, index);
    }
  }

  updateFAQItem(chunkId, index, field, value) {
    if (this.app && this.app.updateSlideFAQItem) {
      this.app.updateSlideFAQItem(chunkId, index, field, value);
    }
  }

  addFAQItem(chunkId) {
    if (this.app && this.app.addSlideFAQItem) {
      this.app.addSlideFAQItem(chunkId);
    }
  }

  deleteFAQItem(chunkId, index) {
    if (this.app && this.app.deleteSlideFAQItem) {
      this.app.deleteSlideFAQItem(chunkId, index);
    }
  }

  updatePopup(chunkId, index, field, value) {
    if (this.app && this.app.updateSlidePopup) {
      this.app.updateSlidePopup(chunkId, index, field, value);
    }
  }

  addPopup(chunkId) {
    if (this.app && this.app.addSlidePopup) {
      this.app.addSlidePopup(chunkId);
    }
  }

  deletePopup(chunkId, index) {
    if (this.app && this.app.deleteSlidePopup) {
      this.app.deleteSlidePopup(chunkId, index);
    }
  }

  updateOption(chunkId, index, value) {
    if (this.app && this.app.updateSlideOption) {
      this.app.updateSlideOption(chunkId, index, value);
    }
  }

  addOption(chunkId) {
    if (this.app && this.app.addSlideOption) {
      this.app.addSlideOption(chunkId);
    }
  }

  deleteOption(chunkId, index) {
    if (this.app && this.app.deleteSlideOption) {
      this.app.deleteSlideOption(chunkId, index);
    }
  }

  setCorrectAnswer(chunkId, index) {
    if (this.app && this.app.setSlideCorrectAnswer) {
      this.app.setSlideCorrectAnswer(chunkId, index);
    }
  }

  updateFeedback(chunkId, type, value) {
    if (this.app && this.app.updateSlideFeedback) {
      this.app.updateSlideFeedback(chunkId, type, value);
    }
  }

  updateObjective(chunkId, index, value) {
    if (this.app && this.app.updateSlideObjective) {
      this.app.updateSlideObjective(chunkId, index, value);
    }
  }

  addObjective(chunkId) {
    if (this.app && this.app.addSlideObjective) {
      this.app.addSlideObjective(chunkId);
    }
  }

  updateGenericContent(chunkId, value) {
    if (this.app && this.app.updateSlideGenericContent) {
      this.app.updateSlideGenericContent(chunkId, value);
    }
  }

  regenerateContent(chunkId) {
    if (this.app && this.app.generateChunkContent) {
      this.app.generateChunkContent(chunkId);
    }
  }

  duplicateSlide(chunkId) {
    if (this.app && this.app.duplicateChunk) {
      this.app.duplicateChunk(chunkId);
    }
  }

  previewSlide(chunkId) {
    if (this.app && this.app.previewSingleSlide) {
      this.app.previewSingleSlide(chunkId);
    }
  }

  generateContent(chunkId) {
    if (this.app && this.app.generateChunkContent) {
      this.app.generateChunkContent(chunkId);
    }
  }

  cleanup() {
    this.app = null;
    this.editingChunk = null;
    this.editingField = null;
  }
}

// Global instance
window.slideComponents = new SlideComponents();
