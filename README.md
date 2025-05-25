# Interactive Course Slides - User Guide

A comprehensive slide presentation system with audio narration, interactive elements, and a built-in editor for creating engaging educational content.

## 🚀 Quick Start

1. Open `auto.html` in your web browser
2. Use the default slides to explore features, or click **Load JSON** to import your own content
3. Navigate with arrow keys or the Previous/Next buttons
4. Click the audio play button to hear narration for each slide

## 🎯 Key Features

- **10 Different Slide Types** - From simple text to interactive quizzes
- **Audio Narration** - Text-to-speech with custom scripts for each slide
- **Visual Editor** - Create and edit slides without coding
- **Export Functionality** - Download standalone HTML presentations
- **Responsive Design** - Works on desktop, tablet, and mobile devices

## 📊 Available Slide Types

### 1. Title Slide

- **Purpose**: Course introduction or section headers
- **Fields**: Title text, Audio script
- **Best for**: Opening slides, chapter dividers

### 2. Course Information

- **Purpose**: Overview content with header and description
- **Fields**: Header, Content paragraph, Audio script
- **Best for**: Course descriptions, learning objectives

### 3. Text and Image

- **Purpose**: Content with visual support
- **Fields**: Header, Text content, Image URL, Audio script
- **Best for**: Concept explanations with illustrations

### 4. Text with Bullet Points

- **Purpose**: Lists and structured information
- **Fields**: Header, Intro text, Bullet points (one per line), Audio script
- **Best for**: Learning outcomes, feature lists, step-by-step processes

### 5. Icons with Titles

- **Purpose**: Visual feature highlights
- **Fields**: Header, Icons array (JSON format), Audio script
- **JSON Format**:

```json
[
  {
    "icon": "book-open",
    "title": "Feature Title",
    "description": "Feature description"
  }
]
```

- **Best for**: Course features, benefits, key concepts

### 6. FAQ

- **Purpose**: Question and answer format
- **Fields**: Header, FAQ items (JSON format), Audio script
- **JSON Format**:

```json
[
  {
    "question": "Your question here?",
    "answer": "Detailed answer here"
  }
]
```

- **Best for**: Common questions, troubleshooting, clarifications

### 7. Flip Cards

- **Purpose**: Interactive reveal content
- **Fields**: Cards array (JSON format), Audio script
- **JSON Format**:

```json
[
  {
    "front": "Question or topic",
    "back": "Answer or explanation"
  }
]
```

- **Interaction**: Click cards to flip and reveal content
- **Best for**: Vocabulary, definitions, quick facts

### 8. Multiple Choice Quiz

- **Purpose**: Knowledge assessment
- **Fields**: Question, Options (one per line), Correct answer index, Feedback messages, Audio script
- **Features**: Immediate feedback, correct/incorrect highlighting
- **Best for**: Knowledge checks, assessments

### 9. Tabs

- **Purpose**: Organized content sections
- **Fields**: Tabs array (JSON format), Audio script
- **JSON Format**:

```json
[
  {
    "title": "Tab Name",
    "content": "Tab content goes here"
  }
]
```

- **Best for**: Curriculum breakdown, feature comparisons

### 10. Information Popups

- **Purpose**: Additional resources and details
- **Fields**: Popups array (JSON format), Audio script
- **JSON Format**:

```json
[
  {
    "title": "Popup Title",
    "content": "Detailed content for popup"
  }
]
```

- **Interaction**: Click cards to open detailed popups
- **Best for**: Additional resources, detailed explanations

## 🎵 Audio Features

### Audio Controls

- **Play/Pause**: Toggle audio narration
- **Restart**: Restart current slide's audio
- **Transcript**: View/hide text transcript
- **Edit**: Quick access to edit audio script

### Audio Scripts

- Every slide type supports custom audio narration
- Scripts are read aloud using text-to-speech
- Fallback message for slides without audio scripts
- Progress bar shows playback progress

### Keyboard Shortcuts

- **Space**: Play/pause audio
- **Left Arrow**: Previous slide
- **Right Arrow**: Next slide
- **Escape**: Close modals and panels

## ✏️ Editing Interface

### Slide Management

1. **Manage Button**: Opens slide manager panel
2. **Add Slide**: Create new slides
3. **Edit Current**: Modify the current slide
4. **Delete**: Remove slides (with confirmation)
5. **Reorder**: Move slides up/down in the manager

### Edit Modal Features

- **Slide Type Selection**: Choose from 10 slide types
- **Dynamic Fields**: Form fields change based on slide type
- **JSON Helpers**: Guidance for complex field formats
- **Audio Script**: Always available for narration
- **Real-time Preview**: Changes apply immediately

### JSON Editor

- **Load JSON**: Import course data from files or text
- **File Upload**: Drag and drop JSON files
- **Validation**: Error checking for malformed data
- **Backward Compatibility**: Supports legacy formats

## 📤 Export & Sharing

### Download Feature

- **Standalone HTML**: Creates single-file presentation
- **Embedded Styles**: All CSS included in the file
- **JavaScript Bundle**: Complete functionality preserved
- **No Dependencies**: Works offline after download

### Standalone Features Include:

- Full slide functionality
- Audio narration
- Interactive elements
- Keyboard navigation
- Mobile responsiveness

## 🎨 Customization

### Styling

- Modern gradient background
- Card-based slide layouts
- Responsive grid systems
- Smooth animations with GSAP
- Icon support via Lucide

### Layout Options

- **Desktop**: Full-width layouts with side navigation
- **Tablet**: Adapted layouts for touch interaction
- **Mobile**: Single-column layouts with larger touch targets

## 📱 Mobile Optimization

- Touch-friendly navigation buttons
- Responsive grid layouts
- Optimized modal sizes
- Swipe-friendly interactions
- Readable typography on small screens

## 🔧 Technical Details

### File Structure

- `auto.html` - Main application file
- `styles.css` - Complete styling system
- `script.js` - Main application logic
- `slideRenderers.js` - Slide rendering functions
- `slideEditor.js` - Edit interface logic
- `slideManager.js` - Slide management functions
- `audioManager.js` - Audio system
- `jsonLoader.js` - Data import/export
- `courseDownloader.js` - Export functionality
- `courseData.js` - Default course content

### Dependencies

- **GSAP**: Smooth animations
- **Lucide**: Icon system
- **Modern Browsers**: ES6+ support required

### Data Format

Course data can be structured as either:

1. **Legacy Format**: Separate objects for each slide type
2. **Modern Format**: Array of slide objects with type and data

## 💡 Best Practices

### Content Creation

- **Keep text concise** for better audio narration
- **Use high-quality images** with proper aspect ratios
- **Write clear audio scripts** that enhance the visual content
- **Test interactive elements** before finalizing

### Audio Scripts

- Write in a conversational tone
- Include pronunciation guides for complex terms
- Keep scripts focused and relevant to slide content
- Test audio length matches slide complexity

### Navigation Flow

- Start with a title slide
- Use course info slides for overviews
- Intersperse interactive elements (quizzes, flip cards)
- End with resources or next steps

### Performance

- Optimize images before adding URLs
- Keep JSON arrays reasonably sized
- Test on target devices before deploying

## 🐛 Troubleshooting

### Common Issues

- **Audio not playing**: Check browser permissions for speech synthesis
- **Images not loading**: Verify image URLs are accessible
- **JSON errors**: Validate JSON format using online tools
- **Mobile layout issues**: Test responsive breakpoints

### Browser Support

- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Full support (some audio limitations)
- **Mobile browsers**: Full support with touch optimizations

## 📚 Example Use Cases

- **Corporate Training**: Employee onboarding, compliance training
- **Educational Courses**: Online lectures, tutorials
- **Product Demos**: Feature walkthroughs, user guides
- **Presentations**: Sales pitches, project updates
- **Documentation**: Interactive user manuals

---

_This system provides a complete solution for creating engaging, interactive presentations with minimal technical knowledge required._
