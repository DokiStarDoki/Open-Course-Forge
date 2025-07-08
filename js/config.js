/**
 * Course Forge MVP - Configuration Constants
 * Centralized configuration for the application
 */

const CONFIG = {
  // ====== API PROVIDER TOGGLE ======
  // Set to true for ChatGPT API (secure, for real course data)
  // Set to false for OpenRouter/DeepSeek (free, for debugging)
  USE_CHATGPT_API: true,

  // File Upload Settings
  MAX_FILE_SIZE: 15 * 1024 * 1024, // 15MB in bytes
  SUPPORTED_EXTENSIONS: ["txt", "docx", "json"],

  // API Configuration
  API_ENDPOINTS: {
    OPENROUTER: "https://openrouter.ai/api/v1/chat/completions",
    OPENAI: "https://api.openai.com/v1/chat/completions",
  },

  // Model Settings
  AI_MODELS: {
    // OpenRouter/DeepSeek Models (free)
    DEEPSEEK_R1: "deepseek/deepseek-r1-0528-qwen3-8b:free",
    DEEPSEEK_CHAT: "deepseek/deepseek-chat",

    // OpenAI/ChatGPT Models (secure)
    GPT_4O: "gpt-4o",
    GPT_4O_MINI: "gpt-4o-mini",
    GPT_4_TURBO: "gpt-4-turbo",
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

  // Content Processing - UPDATED with higher word and chunk limits
  CONTENT: {
    MAX_WORD_COUNT: 25000, // Increased from 15000 to 25000 for comprehensive reference content
    MIN_WORD_COUNT: 100,
    DEFAULT_CHUNK_COUNT: 12, // Increased from 8 to 12 for better default
    MAX_CHUNK_COUNT: 60, // Increased from 20 to 60 to support longer courses
    MIN_CHUNK_COUNT: 6, // Added explicit minimum
    CHUNK_DURATION_MINUTES: 2.5, // Average time per chunk for calculations
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
    // ADDED: Course duration validation
    COURSE_DURATION: {
      MIN_MINUTES: 10,
      MAX_MINUTES: 300, // 5 hours maximum
      DEFAULT_MINUTES: 45,
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
    COURSE_TOO_LONG: "Course duration exceeds maximum limit (5 hours)",
    COURSE_TOO_SHORT: "Course duration below minimum limit (10 minutes)",
    CONTENT_TOO_LONG: "Source content exceeds maximum limit (25,000 words)",
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

  // ADDED: Helper methods for chunk calculations
  calculateOptimalChunks(durationString) {
    if (!durationString || durationString.trim() === "") {
      return this.CONTENT.DEFAULT_CHUNK_COUNT;
    }

    // Extract minutes from duration string
    let minutes = 0;

    if (durationString.includes("hour")) {
      const hourMatch = durationString.match(/(\d+)\s*hour/);
      if (hourMatch) {
        minutes = parseInt(hourMatch[1]) * 60;
      }
    } else {
      const minuteMatch = durationString.match(/(\d+)/);
      if (minuteMatch) {
        minutes = parseInt(minuteMatch[1]);
      }
    }

    if (minutes === 0) {
      return this.CONTENT.DEFAULT_CHUNK_COUNT;
    }

    // Calculate ideal chunks based on duration
    const idealChunks = Math.round(
      minutes / this.CONTENT.CHUNK_DURATION_MINUTES
    );

    // Apply bounds
    return Math.max(
      this.CONTENT.MIN_CHUNK_COUNT,
      Math.min(this.CONTENT.MAX_CHUNK_COUNT, idealChunks)
    );
  },

  getChunkCalculationInfo(durationString) {
    const optimalChunks = this.calculateOptimalChunks(durationString);
    const actualDuration = optimalChunks * this.CONTENT.CHUNK_DURATION_MINUTES;

    return {
      optimalChunks,
      actualDuration,
      isWithinLimits:
        optimalChunks >= this.CONTENT.MIN_CHUNK_COUNT &&
        optimalChunks <= this.CONTENT.MAX_CHUNK_COUNT,
      suggestion:
        optimalChunks === this.CONTENT.MAX_CHUNK_COUNT
          ? "Consider breaking long courses into multiple modules"
          : null,
    };
  },

  // Helper methods for API provider logic
  getActiveAPIProvider() {
    return this.USE_CHATGPT_API ? "OPENAI" : "OPENROUTER";
  },

  getActiveAPIEndpoint() {
    return this.USE_CHATGPT_API
      ? this.API_ENDPOINTS.OPENAI
      : this.API_ENDPOINTS.OPENROUTER;
  },

  getDefaultModel() {
    return this.USE_CHATGPT_API
      ? this.AI_MODELS.GPT_4O_MINI
      : this.AI_MODELS.DEEPSEEK_R1;
  },

  getModelForTask(task) {
    if (this.USE_CHATGPT_API) {
      // Use different GPT models based on task complexity
      switch (task) {
        case "chunking":
          return this.AI_MODELS.GPT_4O_MINI; // Faster for chunking
        case "content_generation":
          return this.AI_MODELS.GPT_4O; // Better quality for content
        default:
          return this.AI_MODELS.GPT_4O_MINI;
      }
    } else {
      // Use DeepSeek models
      switch (task) {
        case "chunking":
          return this.AI_MODELS.DEEPSEEK_R1; // Free model for chunking
        case "content_generation":
          return this.AI_MODELS.DEEPSEEK_CHAT; // Better for content
        default:
          return this.AI_MODELS.DEEPSEEK_R1;
      }
    }
  },
};

// Freeze the config object to prevent accidental modifications
Object.freeze(CONFIG);

// Export for module systems (if needed)
if (typeof module !== "undefined" && module.exports) {
  module.exports = CONFIG;
}
