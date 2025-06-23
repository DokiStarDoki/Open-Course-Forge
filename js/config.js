/**
 * Course Forge MVP - Configuration Constants
 * Centralized configuration for the application
 */

const CONFIG = {
  // File Upload Settings
  MAX_FILE_SIZE: 15 * 1024 * 1024, // 15MB in bytes
  SUPPORTED_EXTENSIONS: ["txt", "docx", "json"],

  // API Configuration
  API_ENDPOINTS: {
    OPENROUTER: "https://openrouter.ai/api/v1/chat/completions",
  },

  // Model Settings
  AI_MODELS: {
    DEEPSEEK_R1: "deepseek/deepseek-r1-0528-qwen3-8b:free",
    DEEPSEEK_CHAT: "deepseek/deepseek-chat",
  },

  // Local Storage Keys
  LOCAL_STORAGE_KEYS: {
    COURSE_STATE: "courseforge_state",
    API_KEY: "courseforge_api_key",
    USER_PREFERENCES: "courseforge_preferences",
  },

  // UI Settings
  UI: {
    ANIMATION_DURATION: 250,
    STATUS_MESSAGE_DURATION: 1250,
    ERROR_MESSAGE_DURATION: 4500,
  },

  // Content Processing
  CONTENT: {
    MAX_WORD_COUNT: 15000,
    MIN_WORD_COUNT: 100,
    DEFAULT_CHUNK_COUNT: 8,
    MAX_CHUNK_COUNT: 20,
  },

  // Slide Types
  SLIDE_TYPES: [
    { value: "title", label: "Title Slide", icon: "type" },
    { value: "courseInfo", label: "Course Information", icon: "info" },
    { value: "textAndImage", label: "Text and Image", icon: "image" },
    { value: "textAndBullets", label: "Text with Bullets", icon: "list" },
    { value: "iconsWithTitles", label: "Icons with Titles", icon: "grid-3x3" },
    { value: "faq", label: "FAQ", icon: "help-circle" },
    { value: "flipCards", label: "Flip Cards", icon: "square-stack" },
    { value: "multipleChoice", label: "Multiple Choice", icon: "check-square" },
    { value: "tabs", label: "Tabs", icon: "tabs" },
    { value: "popups", label: "Information Popups", icon: "message-square" },
  ],

  // Default Course Configuration
  DEFAULTS: {
    COURSE_CONFIG: {
      title: "",
      estimatedDuration: "",
      targetAudience: "",
      learningObjectives: [],
      additionalGuidance: "",
      sourceContent: "",
      uploadedFiles: [],
    },

    CHUNK: {
      title: "New Chunk",
      slideType: "textAndImage",
      isLocked: false,
      sourceContent: "",
      order: 0,
      generatedContent: null,
    },
  },

  // Validation Rules
  VALIDATION: {
    COURSE_TITLE: {
      MIN_LENGTH: 3,
      MAX_LENGTH: 100,
    },
    LEARNING_OBJECTIVES: {
      MIN_COUNT: 1,
      MAX_COUNT: 10,
    },
    CHUNK_TITLE: {
      MIN_LENGTH: 3,
      MAX_LENGTH: 80,
    },
  },

  // Error Messages
  ERROR_MESSAGES: {
    FILE_TOO_LARGE: "File is too large (max 15MB)",
    UNSUPPORTED_FILE_TYPE: "Unsupported file type",
    INVALID_JSON: "Invalid JSON file format",
    NO_CONTENT: "No content found in uploaded files",
    MISSING_TITLE: "Course title is required",
    MISSING_OBJECTIVES: "At least one learning objective is required",
    API_ERROR: "Failed to communicate with AI service",
    NETWORK_ERROR: "Network connection error",
    PROCESSING_ERROR: "Error processing content",
  },

  // Success Messages
  SUCCESS_MESSAGES: {
    FILE_UPLOADED: "File uploaded successfully",
    COURSE_LOADED: "Course loaded successfully",
    CONTENT_CHUNKED: "Content chunked successfully",
    SLIDE_GENERATED: "Slide content generated successfully",
    COURSE_EXPORTED: "Course exported successfully",
  },

  // Debug Settings
  DEBUG: {
    ENABLED: true, // Set to false in production
    LOG_LEVEL: "info", // 'debug', 'info', 'warn', 'error'
  },
};

// Freeze the config object to prevent accidental modifications
Object.freeze(CONFIG);

// Export for module systems (if needed)
if (typeof module !== "undefined" && module.exports) {
  module.exports = CONFIG;
}
