// Slide Rendering Functions
const SlideRenderers = {
  renderTitleSlide(data) {
    return `
      <div class="slide active title-slide">
          <h1>${data}</h1>
          <div class="title-divider"></div>
      </div>
    `;
  },

  renderCourseInfo(data) {
    return `
      <div class="slide active">
          <div class="card">
              <h2 class="card-header">${data.header}</h2>
              <p class="card-content">${data.content}</p>
          </div>
      </div>
    `;
  },

  renderFAQ(data) {
    const items = data.items
      .map(
        (item) => `
          <div class="faq-item">
              <h3 class="faq-question">${item.question}</h3>
              <p class="faq-answer">${item.answer}</p>
          </div>
        `
      )
      .join("");

    return `
      <div class="slide active">
          <div style="max-width: 800px; margin: 0 auto;">
              <h2 class="card-header text-center mb-8">${data.header}</h2>
              ${items}
          </div>
      </div>
    `;
  },

  renderTextAndImage(data) {
    return `
      <div class="slide active">
          <div style="max-width: 1000px; margin: 0 auto;">
              <h2 class="card-header text-center mb-8">${data.header}</h2>
              <div class="text-image-container">
                  <div>
                      <p class="card-content">${data.text}</p>
                  </div>
                  <div>
                      <img src="${data.image}" alt="Development" />
                  </div>
              </div>
          </div>
      </div>
    `;
  },

  renderTextAndBullets(data) {
    const bullets = data.bullets
      .map(
        (bullet) => `
          <li class="bullet-item">
              <div class="bullet-dot"></div>
              <span>${bullet}</span>
          </li>
        `
      )
      .join("");

    return `
      <div class="slide active">
          <div style="max-width: 800px; margin: 0 auto;">
              <h2 class="card-header">${data.header}</h2>
              <p class="card-content mb-6">${data.text}</p>
              <ul class="bullet-list">
                  ${bullets}
              </ul>
          </div>
      </div>
    `;
  },

  renderIconsWithTitles(data) {
    const icons = data.icons
      .map(
        (item) => `
          <div class="icon-card">
              <i data-lucide="${item.icon}"></i>
              <h3>${item.title}</h3>
              <p>${item.description}</p>
          </div>
        `
      )
      .join("");

    return `
      <div class="slide active">
          <div style="max-width: 1000px; margin: 0 auto;">
              <h2 class="card-header text-center mb-8">${data.header}</h2>
              <div class="grid grid-cols-3">
                  ${icons}
              </div>
          </div>
      </div>
    `;
  },

  renderFlipCards(data) {
    const cards = data
      .map(
        (card, index) => `
          <div class="flip-card" onclick="toggleCard(${index})">
              <div class="flip-card-inner">
                  <div class="flip-card-front">
                      <p>${card.front}</p>
                  </div>
                  <div class="flip-card-back">
                      <p>${card.back}</p>
                  </div>
              </div>
          </div>
        `
      )
      .join("");

    return `
      <div class="slide active">
          <div style="width: 100%; max-width: 1400px; margin: 0 auto; padding: 0 2rem;">
              <h2 class="card-header text-center mb-8">Key Concepts</h2>
              <div class="flip-cards-grid">
                  ${cards}
              </div>
          </div>
      </div>
    `;
  },

  renderMultipleChoice(data, currentSlide, selectedAnswers, showFeedback) {
    const questionId = currentSlide;
    const userAnswer = selectedAnswers[questionId];
    const showQuestionFeedback = showFeedback[questionId];

    const options = data.options
      .map((option, index) => {
        let className = "choice-option";
        if (userAnswer === index) {
          className += index === data.correctAnswer ? " correct" : " incorrect";
        }

        return `
          <button class="${className}" onclick="handleAnswerSelect(${questionId}, ${index})">
              ${option}
          </button>
        `;
      })
      .join("");

    const feedbackHtml = showQuestionFeedback
      ? `
          <div class="feedback ${
            userAnswer === data.correctAnswer ? "correct" : "incorrect"
          }">
              ${
                userAnswer === data.correctAnswer
                  ? data.feedback.correct
                  : data.feedback.incorrect
              }
          </div>
        `
      : "";

    return `
      <div class="slide active">
          <div style="max-width: 800px; margin: 0 auto;">
              <h2 class="card-header">Knowledge Check</h2>
              <div class="card">
                  <h3 class="mb-6" style="font-size: 1.25rem; font-weight: 600;">${data.question}</h3>
                  ${options}
                  ${feedbackHtml}
              </div>
          </div>
      </div>
    `;
  },

  renderTabs(data, currentSlide, activeTabs) {
    const activeTabIndex = activeTabs[currentSlide] || 0;

    const tabButtons = data
      .map(
        (tab, index) => `
          <button class="tab-button ${
            index === activeTabIndex ? "active" : ""
          }" 
                  onclick="setActiveTab(${currentSlide}, ${index})">
              ${tab.title}
          </button>
        `
      )
      .join("");

    return `
      <div class="slide active">
          <div style="max-width: 800px; margin: 0 auto;">
              <h2 class="card-header text-center mb-8">Course Curriculum</h2>
              <div class="tabs-container">
                  <div class="tabs-nav">
                      ${tabButtons}
                  </div>
                  <div class="tab-content">
                      ${data[activeTabIndex].content}
                  </div>
              </div>
          </div>
      </div>
    `;
  },

  renderPopups(data) {
    const popupTriggers = data
      .map(
        (popup, index) => `
          <button class="popup-trigger" onclick="openPopup(${index})">
              <div class="popup-trigger-header">
                  <i data-lucide="info"></i>
                  <h3>${popup.title}</h3>
              </div>
              <p>Click to learn more</p>
          </button>
        `
      )
      .join("");

    return `
      <div class="slide active">
          <div style="max-width: 1000px; margin: 0 auto;">
              <h2 class="card-header text-center mb-8">Additional Resources</h2>
              <div class="popup-grid">
                  ${popupTriggers}
              </div>
          </div>
      </div>
    `;
  },
};
