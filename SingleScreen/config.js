/**
 * Course Forge MVP - Configuration
 * Central configuration for the application
 */

const CONFIG = {
  // Debug settings
  DEBUG: {
    ENABLED: true,
    LOG_LEVEL: "info",
  },

  // Slide types configuration
  SLIDE_TYPES: [
    { value: "title", label: "Title Slide" },
    { value: "courseInfo", label: "Course Information" },
    { value: "textAndImage", label: "Text and Image" },
    { value: "textAndBullets", label: "Text with Bullets" },
    { value: "iconsWithTitles", label: "Icons with Titles" },
    { value: "multipleChoice", label: "Multiple Choice" },
    { value: "tabs", label: "Tabs" },
    { value: "flipCards", label: "Flip Cards" },
    { value: "faq", label: "FAQ" },
    { value: "popups", label: "Popups" },
  ],

  // Validation rules
  VALIDATION: {
    COURSE_TITLE: {
      MIN_LENGTH: 3,
      MAX_LENGTH: 100,
    },
    LEARNING_OBJECTIVES: {
      MIN_COUNT: 1,
    },
  },

  // Content limits
  CONTENT: {
    MIN_WORD_COUNT: 100,
    MAX_WORD_COUNT: 50000,
  },

  // API configuration
  getActiveAPIProvider: () => "OPENROUTER",
  getActiveAPIEndpoint: () => "https://openrouter.ai/api/v1/chat/completions",
  getDefaultModel: () => "anthropic/claude-3-5-sonnet-20241022",
  getModelForTask: (task) => "anthropic/claude-3-5-sonnet-20241022",
  USE_CHATGPT_API: false,

  // File upload settings
  UPLOAD: {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ACCEPTED_TYPES: [".pdf", ".doc", ".docx", ".txt", ".md"],
    MAX_FILES: 20,
  },

  // UI settings
  UI: {
    AUTO_SAVE_DELAY: 1000, // ms
    STATUS_MESSAGE_DURATION: 5000, // ms
    ANIMATION_DURATION: 300, // ms
  },
};

// Make available globally
window.CONFIG = CONFIG;
