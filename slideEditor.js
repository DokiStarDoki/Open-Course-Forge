// Slide Editing Functions
const SlideEditor = {
  generateSlideEditFields(slideType) {
    let fieldsHtml = "";

    switch (slideType) {
      case "title":
        fieldsHtml = `
          <div class="form-group">
            <label class="form-label">Title Text</label>
            <input type="text" id="field_title" class="form-input" placeholder="Enter title text" required>
          </div>
          <div class="form-group">
            <label class="form-label">Audio Script (Optional)</label>
            <textarea id="field_audioScript" class="form-textarea" placeholder="Enter audio narration script for this slide" rows="3"></textarea>
            <small style="color: #6b7280;">This text will be read aloud when the audio is played</small>
          </div>
        `;
        break;

      case "courseInfo":
        fieldsHtml = `
          <div class="form-group">
            <label class="form-label">Header</label>
            <input type="text" id="field_header" class="form-input" placeholder="Enter header" required>
          </div>
          <div class="form-group">
            <label class="form-label">Content</label>
            <textarea id="field_content" class="form-textarea" placeholder="Enter content" required></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Audio Script (Optional)</label>
            <textarea id="field_audioScript" class="form-textarea" placeholder="Enter audio narration script for this slide" rows="3"></textarea>
            <small style="color: #6b7280;">This text will be read aloud when the audio is played</small>
          </div>
        `;
        break;

      case "textAndImage":
        fieldsHtml = `
          <div class="form-group">
            <label class="form-label">Header</label>
            <input type="text" id="field_header" class="form-input" placeholder="Enter header" required>
          </div>
          <div class="form-group">
            <label class="form-label">Text</label>
            <textarea id="field_text" class="form-textarea" placeholder="Enter text content" required></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Image URL</label>
            <input type="url" id="field_image" class="form-input" placeholder="https://example.com/image.jpg" required>
          </div>
          <div class="form-group">
            <label class="form-label">Audio Script (Optional)</label>
            <textarea id="field_audioScript" class="form-textarea" placeholder="Enter audio narration script for this slide" rows="3"></textarea>
            <small style="color: #6b7280;">This text will be read aloud when the audio is played</small>
          </div>
        `;
        break;

      case "textAndBullets":
        fieldsHtml = `
          <div class="form-group">
            <label class="form-label">Header</label>
            <input type="text" id="field_header" class="form-input" placeholder="Enter header" required>
          </div>
          <div class="form-group">
            <label class="form-label">Text</label>
            <textarea id="field_text" class="form-textarea" placeholder="Enter text content" required></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Bullet Points (one per line)</label>
            <textarea id="field_bullets" class="form-textarea" placeholder="Enter bullet points, one per line" rows="5" required></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Audio Script (Optional)</label>
            <textarea id="field_audioScript" class="form-textarea" placeholder="Enter audio narration script for this slide" rows="3"></textarea>
            <small style="color: #6b7280;">This text will be read aloud when the audio is played</small>
          </div>
        `;
        break;

      case "iconsWithTitles":
        fieldsHtml = `
          <div class="form-group">
            <label class="form-label">Header</label>
            <input type="text" id="field_header" class="form-input" placeholder="Enter header" required>
          </div>
          <div class="form-group">
            <label class="form-label">Icons (JSON format)</label>
            <textarea id="field_icons" class="form-textarea" placeholder='[{"icon": "book-open", "title": "Title", "description": "Description"}]' rows="8" required></textarea>
            <small style="color: #6b7280;">Enter an array of objects with icon, title, and description properties</small>
          </div>
          <div class="form-group">
            <label class="form-label">Audio Script (Optional)</label>
            <textarea id="field_audioScript" class="form-textarea" placeholder="Enter audio narration script for this slide" rows="3"></textarea>
            <small style="color: #6b7280;">This text will be read aloud when the audio is played</small>
          </div>
        `;
        break;

      case "faq":
        fieldsHtml = `
          <div class="form-group">
            <label class="form-label">Header</label>
            <input type="text" id="field_header" class="form-input" placeholder="Enter header" required>
          </div>
          <div class="form-group">
            <label class="form-label">FAQ Items (JSON format)</label>
            <textarea id="field_items" class="form-textarea" placeholder='[{"question": "Question?", "answer": "Answer"}]' rows="8" required></textarea>
            <small style="color: #6b7280;">Enter an array of objects with question and answer properties</small>
          </div>
          <div class="form-group">
            <label class="form-label">Audio Script (Optional)</label>
            <textarea id="field_audioScript" class="form-textarea" placeholder="Enter audio narration script for this slide" rows="3"></textarea>
            <small style="color: #6b7280;">This text will be read aloud when the audio is played</small>
          </div>
        `;
        break;

      case "flipCards":
        fieldsHtml = `
          <div class="form-group">
            <label class="form-label">Flip Cards (JSON format)</label>
            <textarea id="field_cards" class="form-textarea" placeholder='[{"front": "Question", "back": "Answer"}]' rows="8" required></textarea>
            <small style="color: #6b7280;">Enter an array of objects with front and back properties</small>
          </div>
          <div class="form-group">
            <label class="form-label">Audio Script (Optional)</label>
            <textarea id="field_audioScript" class="form-textarea" placeholder="Enter audio narration script for this slide" rows="3"></textarea>
            <small style="color: #6b7280;">This text will be read aloud when the audio is played</small>
          </div>
        `;
        break;

      case "multipleChoice":
        fieldsHtml = `
          <div class="form-group">
            <label class="form-label">Question</label>
            <textarea id="field_question" class="form-textarea" placeholder="Enter the question" required></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Options (one per line)</label>
            <textarea id="field_options" class="form-textarea" placeholder="Option 1\nOption 2\nOption 3\nOption 4" rows="4" required></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Correct Answer (0-based index)</label>
            <input type="number" id="field_correctAnswer" class="form-input" min="0" placeholder="0" required>
          </div>
          <div class="form-group">
            <label class="form-label">Correct Feedback</label>
            <textarea id="field_correctFeedback" class="form-textarea" placeholder="Feedback for correct answer" required></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Incorrect Feedback</label>
            <textarea id="field_incorrectFeedback" class="form-textarea" placeholder="Feedback for incorrect answer" required></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Audio Script (Optional)</label>
            <textarea id="field_audioScript" class="form-textarea" placeholder="Enter audio narration script for this slide" rows="3"></textarea>
            <small style="color: #6b7280;">This text will be read aloud when the audio is played</small>
          </div>
        `;
        break;

      case "tabs":
        fieldsHtml = `
          <div class="form-group">
            <label class="form-label">Tabs (JSON format)</label>
            <textarea id="field_tabs" class="form-textarea" placeholder='[{"title": "Tab 1", "content": "Tab content"}]' rows="8" required></textarea>
            <small style="color: #6b7280;">Enter an array of objects with title and content properties</small>
          </div>
          <div class="form-group">
            <label class="form-label">Audio Script (Optional)</label>
            <textarea id="field_audioScript" class="form-textarea" placeholder="Enter audio narration script for this slide" rows="3"></textarea>
            <small style="color: #6b7280;">This text will be read aloud when the audio is played</small>
          </div>
        `;
        break;

      case "popups":
        fieldsHtml = `
          <div class="form-group">
            <label class="form-label">Popups (JSON format)</label>
            <textarea id="field_popups" class="form-textarea" placeholder='[{"title": "Title", "content": "Content"}]' rows="8" required></textarea>
            <small style="color: #6b7280;">Enter an array of objects with title and content properties</small>
          </div>
          <div class="form-group">
            <label class="form-label">Audio Script (Optional)</label>
            <textarea id="field_audioScript" class="form-textarea" placeholder="Enter audio narration script for this slide" rows="3"></textarea>
            <small style="color: #6b7280;">This text will be read aloud when the audio is played</small>
          </div>
        `;
        break;
    }

    document.getElementById("slideEditFields").innerHTML = fieldsHtml;
  },

  populateSlideEditForm(slideIndex) {
    const slide = window.slides[slideIndex];
    const slideType = slide.type;

    slideTypeSelect.value = slideType;
    this.generateSlideEditFields(slideType);

    switch (slideType) {
      case "title":
        document.getElementById("field_title").value = slide.data;
        break;

      case "courseInfo":
        document.getElementById("field_header").value = slide.data.header;
        document.getElementById("field_content").value = slide.data.content;
        break;

      case "textAndImage":
        document.getElementById("field_header").value = slide.data.header;
        document.getElementById("field_text").value = slide.data.text;
        document.getElementById("field_image").value = slide.data.image;
        break;

      case "textAndBullets":
        document.getElementById("field_header").value = slide.data.header;
        document.getElementById("field_text").value = slide.data.text;
        document.getElementById("field_bullets").value =
          slide.data.bullets.join("\n");
        break;

      case "iconsWithTitles":
        document.getElementById("field_header").value = slide.data.header;
        document.getElementById("field_icons").value = JSON.stringify(
          slide.data.icons,
          null,
          2
        );
        break;

      case "faq":
        document.getElementById("field_header").value = slide.data.header;
        document.getElementById("field_items").value = JSON.stringify(
          slide.data.items,
          null,
          2
        );
        break;

      case "flipCards":
        document.getElementById("field_cards").value = JSON.stringify(
          slide.data,
          null,
          2
        );
        break;

      case "multipleChoice":
        document.getElementById("field_question").value = slide.data.question;
        document.getElementById("field_options").value =
          slide.data.options.join("\n");
        document.getElementById("field_correctAnswer").value =
          slide.data.correctAnswer;
        document.getElementById("field_correctFeedback").value =
          slide.data.feedback.correct;
        document.getElementById("field_incorrectFeedback").value =
          slide.data.feedback.incorrect;
        break;

      case "tabs":
        document.getElementById("field_tabs").value = JSON.stringify(
          slide.data,
          null,
          2
        );
        break;

      case "popups":
        document.getElementById("field_popups").value = JSON.stringify(
          slide.data,
          null,
          2
        );
        break;
    }

    // IMPORTANT: Set the audio script field after populating other fields
    const audioScriptField = document.getElementById("field_audioScript");
    if (audioScriptField && slide.audioScript) {
      audioScriptField.value = slide.audioScript;
    }
  },

  saveSlide() {
    const slideType = slideTypeSelect.value;
    let slideData = {};

    try {
      switch (slideType) {
        case "title":
          slideData = document.getElementById("field_title").value;
          break;

        case "courseInfo":
          slideData = {
            header: document.getElementById("field_header").value,
            content: document.getElementById("field_content").value,
          };
          break;

        case "textAndImage":
          slideData = {
            header: document.getElementById("field_header").value,
            text: document.getElementById("field_text").value,
            image: document.getElementById("field_image").value,
          };
          break;

        case "textAndBullets":
          slideData = {
            header: document.getElementById("field_header").value,
            text: document.getElementById("field_text").value,
            bullets: document
              .getElementById("field_bullets")
              .value.split("\n")
              .filter((b) => b.trim()),
          };
          break;

        case "iconsWithTitles":
          slideData = {
            header: document.getElementById("field_header").value,
            icons: JSON.parse(document.getElementById("field_icons").value),
          };
          break;

        case "faq":
          slideData = {
            header: document.getElementById("field_header").value,
            items: JSON.parse(document.getElementById("field_items").value),
          };
          break;

        case "flipCards":
          slideData = JSON.parse(document.getElementById("field_cards").value);
          break;

        case "multipleChoice":
          slideData = {
            question: document.getElementById("field_question").value,
            options: document
              .getElementById("field_options")
              .value.split("\n")
              .filter((o) => o.trim()),
            correctAnswer: parseInt(
              document.getElementById("field_correctAnswer").value
            ),
            feedback: {
              correct: document.getElementById("field_correctFeedback").value,
              incorrect: document.getElementById("field_incorrectFeedback")
                .value,
            },
          };
          break;

        case "tabs":
          slideData = JSON.parse(document.getElementById("field_tabs").value);
          break;

        case "popups":
          slideData = JSON.parse(document.getElementById("field_popups").value);
          break;
      }

      // Get the audio script value - this was the missing piece!
      const audioScriptField = document.getElementById("field_audioScript");
      const audioScript = audioScriptField ? audioScriptField.value.trim() : "";

      const newSlide = {
        type: slideType,
        data: slideData,
        audioScript: audioScript || undefined, // Only include if not empty
      };

      if (window.editingSlideIndex >= 0) {
        // Editing existing slide
        window.slides[window.editingSlideIndex] = newSlide;
      } else {
        // Adding new slide
        window.slides.push(newSlide);
        window.currentSlide = window.slides.length - 1;
      }

      renderSlide();
      SlideManager.renderSlideManager();
      AudioManager.updateTranscript(); // Update transcript immediately after saving
      this.closeSlideEditModal();
    } catch (error) {
      alert(
        `Error saving slide: ${error.message}\n\nPlease check your input format.`
      );
    }
  },

  openSlideEditModal(slideIndex = -1) {
    window.editingSlideIndex = slideIndex;

    if (slideIndex >= 0) {
      document.getElementById("slideEditTitle").textContent = "Edit Slide";
      this.populateSlideEditForm(slideIndex);
    } else {
      document.getElementById("slideEditTitle").textContent = "Add New Slide";
      document.getElementById("slideTypeSelect").value = "title";
      this.generateSlideEditFields("title");
    }

    document.getElementById("slideEditModal").classList.add("active");
    gsap.fromTo(
      ".modal-content",
      { scale: 0.8, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(1.7)" }
    );
  },

  closeSlideEditModal() {
    gsap.to(".modal-content", {
      scale: 0.8,
      opacity: 0,
      duration: 0.2,
      ease: "power2.in",
      onComplete: () => {
        document.getElementById("slideEditModal").classList.remove("active");
        window.editingSlideIndex = -1;
      },
    });
  },
};
