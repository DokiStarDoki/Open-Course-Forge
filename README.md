# Interactive Course Slides - User Guide

Create engaging presentations with narration, interactivity, and editing tools—no coding needed.

---

## 🚀 Quick Start

1. Open `index.html`
2. Explore default slides or **Load JSON** to import your own
3. Navigate with ←/→ or buttons
4. Click ▶️ to hear narration

---

## 🎯 Features

- 10 Slide Types
- Built-in Text-to-Speech
- Visual Slide Editor
- Export as Standalone HTML
- Responsive Design
- **🧠 AI Help Button** – Auto-generates a prompt to create course data via your AI tool

---

## 📊 Slide Types

| Slide Type             | Purpose / Fields                                                      |
| ---------------------- | --------------------------------------------------------------------- |
| **1. Title**           | Header & Audio. Great for intros & dividers.                          |
| **2. Course Info**     | Header, paragraph, audio. Overview or objectives.                     |
| **3. Text + Image**    | Header, text, image URL, audio. Explains with visuals.                |
| **4. Bullet Points**   | Header, intro, bullets, audio. Great for steps, features.             |
| **5. Icons + Titles**  | JSON: icon, title, desc. Highlights features.                         |
| **6. FAQ**             | JSON: Q&A pairs. Use for common questions.                            |
| **7. Flip Cards**      | JSON: front/back pairs. Click to reveal. Good for terms, definitions. |
| **8. Multiple Choice** | Q, options, correct index, feedback, audio. Instant feedback.         |
| **9. Tabs**            | JSON: tab titles & content. Organize info.                            |
| **10. Popups**         | JSON: clickable titles & content. Great for details or resources.     |

---

## 🎵 Audio Features

- **Controls**: Play/Pause, Restart, Transcript
- **Narration**: Custom script per slide, fallback message if missing
- **Shortcuts**:
  - Space: Play/pause
  - ← / →: Navigation
  - Esc: Close modals

---

## ✏️ Slide Editor

- **Manage Slides**: Add, edit, delete, reorder
- **Edit Modal**: Fields adapt to slide type
- **Live Preview**: Updates instantly
- **JSON Editor**: Drag/drop files, validate data
- **AI Help**: One-click prompt generation for AI tools

---

## 📤 Export & Sharing

- Download as a single HTML file
- Works offline, with embedded styles/scripts
- Preserves all features: audio, interactivity, navigation

---

## 🎨 Customization & Responsiveness

- Modern, card-based layouts
- GSAP animations, Lucide icons
- Works across desktop, tablet, and mobile
- Swipe and touch friendly

---

## 🔧 Tech Overview

**Main Files:**

- `index.html` – Entry point for the course interface
- `styles.css` – Visual styles for layout and components
- `script.js` – Core logic and startup script
- `aiHelper.js` – Generates AI prompts based on slide content
- `audioManager.js` – Handles audio playback and text-to-speech
- `courseData.js` – Default or imported course content
- `courseDownloader.js` – Exports the course as standalone HTML
- `jsonLoader.js` – Imports and validates external JSON content
- `slideEditor.js` – Provides modal editing interface for slides
- `slideManager.js` – Manages slide sequencing and navigation
- `slideRenderers.js` – Displays different slide types dynamically

Other:

- `LICENSE` – Licensing terms
- `README.md` – This user guide

---

## 💡 Best Practices

- Use concise text and clear audio scripts
- Test interactive elements before exporting
- Optimize images and JSON size
- Begin with title/info → mix in interactions → end with summary/resources

---

## 🐛 Troubleshooting

- **Audio not working?** Check browser TTS permissions
- **Broken images?** Verify URLs
- **JSON error?** Validate format
- **Layout issues?** Test on multiple devices

---

## 📚 Example Use Cases

- Corporate Training
- Online Courses
- Product Walkthroughs
- Interactive Docs
- Presentations

---

This system makes it easy to design powerful interactive slides—perfect for learning, training, and storytelling.
