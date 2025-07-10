/**
 * Course Forge MVP - LLM Service with Real AI Integration
 * Implements actual ChatGPT API calls with learning science principles
 */

class SimpleLLMService {
  constructor() {
    this.isReady = false;
    this.apiKey = null;
    this.baseURL = null;
    this.model = null;
    this.maxTokens = 4000;
    this.coursePrompts = null;
    this.initializationPromise = this.initialize();
  }

  async initialize() {
    try {
      // Load local config
      await this.loadLocalConfig();

      // Initialize prompts system
      this.coursePrompts = new CoursePrompts();

      // Test API connection
      await this.testAPIConnection();

      this.isReady = true;

      if (CONFIG.DEBUG.ENABLED) {
        console.log("SimpleLLMService initialized with real AI integration");
        console.log(`Using model: ${this.model}`);
        console.log(`Max tokens: ${this.maxTokens}`);
      }
    } catch (error) {
      console.error("Failed to initialize LLM service:", error);
      throw error;
    }
  }

  async loadLocalConfig() {
    try {
      // Local config should be loaded via script tag in HTML
      if (typeof window.LOCAL_CONFIG === "undefined") {
        throw new Error(
          "Local config not found. Please ensure local.config.js is loaded."
        );
      }

      const config = window.LOCAL_CONFIG;

      // Determine which API to use based on config
      if (config.OPENAI_API_KEY) {
        this.apiKey = config.OPENAI_API_KEY;
        this.baseURL = "https://api.openai.com/v1/chat/completions";
        this.model = "gpt-4o-mini"; // Cost-effective model for course creation
      } else if (config.OPENROUTER_API_KEY) {
        this.apiKey = config.OPENROUTER_API_KEY;
        this.baseURL = CONFIG.getActiveAPIEndpoint();
        this.model = CONFIG.getDefaultModel();
      } else {
        throw new Error("No valid API key found in local config");
      }

      if (config.MAX_TOKENS) {
        this.maxTokens = Math.min(config.MAX_TOKENS, 10000); // Cap at 10k for safety
      }

      if (CONFIG.DEBUG.ENABLED) {
        console.log("Local config loaded successfully");
        console.log(
          `API: ${this.baseURL.includes("openai") ? "OpenAI" : "OpenRouter"}`
        );
      }
    } catch (error) {
      console.error("Error loading local config:", error);
      throw error;
    }
  }

  async testAPIConnection() {
    try {
      const response = await this.makeRawAPICall(
        "Test connection - respond with 'OK'",
        {
          maxTokens: 10,
          temperature: 0,
        }
      );

      if (!response || typeof response !== "string") {
        throw new Error("Invalid API response format");
      }

      if (CONFIG.DEBUG.ENABLED) {
        console.log("API connection test successful");
      }
    } catch (error) {
      console.error("API connection test failed:", error);
      throw new Error(`API connection failed: ${error.message}`);
    }
  }

  async makeAPICall(prompt, options = {}) {
    if (!this.isReady) {
      throw new Error("LLM service not ready. Call ensureReady() first.");
    }

    return this.makeRawAPICall(prompt, options);
  }

  async makeRawAPICall(prompt, options = {}) {
    const {
      maxTokens = this.maxTokens,
      temperature = 0.7,
      timeout = 30000,
    } = options;

    try {
      const requestBody = {
        model: this.model,
        messages: [
          {
            role: "system",
            content:
              "You are an expert instructional designer and course creation assistant. Always follow the provided instructions exactly and respond in the requested format.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: maxTokens,
        temperature: temperature,
      };

      if (window.LOCAL_CONFIG?.DEBUG_API_CALLS) {
        console.log("API Request:", { url: this.baseURL, body: requestBody });
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(this.baseURL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
          ...(this.baseURL.includes("openrouter") && {
            "HTTP-Referer": window.location.origin,
            "X-Title": "Course Forge MVP",
          }),
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Unknown error" }));
        throw new Error(
          `API request failed: ${response.status} - ${
            errorData.error?.message || errorData.error || "Unknown error"
          }`
        );
      }

      const data = await response.json();

      if (window.LOCAL_CONFIG?.DEBUG_API_CALLS) {
        console.log("API Response:", data);
      }

      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("No content in API response");
      }

      return content.trim();
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error(`API request timed out after ${timeout}ms`);
      }
      console.error("API call error:", error);
      throw error;
    }
  }

  async ensureReady() {
    if (!this.isReady) {
      await this.initializationPromise;
    }
  }

  /**
   * Generate initial chunks from course configuration using real AI
   */
  async generateChunks(courseConfig) {
    await this.ensureReady();

    if (CONFIG.DEBUG.ENABLED) {
      console.log("Generating chunks with AI for course:", courseConfig.title);
    }

    // Validate configuration
    const validation = this.validateCourseConfig(courseConfig);
    if (!validation.valid) {
      throw new Error(`Invalid course config: ${validation.errors.join("; ")}`);
    }

    try {
      // Generate chunks using learning science principles
      const prompt = this.coursePrompts.generateChunksPrompt(courseConfig);

      const response = await this.makeAPICall(prompt, {
        maxTokens: 4000,
        temperature: 0.8, // Slightly higher for creativity in structure
      });

      // Parse JSON response
      let chunksData;
      try {
        chunksData = JSON.parse(response);
      } catch (parseError) {
        // Try to extract JSON from response if it's wrapped in text
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          chunksData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("Could not parse JSON response from AI");
        }
      }

      if (!chunksData.chunks || !Array.isArray(chunksData.chunks)) {
        throw new Error("Invalid chunks data structure from AI");
      }

      // Process and enhance chunks with learning science metadata
      const processedChunks = chunksData.chunks.map((chunk, index) => ({
        id: `chunk-${Date.now()}-${index}`,
        title: chunk.title,
        slideType: chunk.slideType || "textAndBullets",
        sourceContent: chunk.sourceContent || "",
        groundTruth: chunk.groundTruth || "",
        estimatedTime: chunk.estimatedTime || "3 minutes",
        order: index,
        isLocked: false,
        generatedContent: null, // Will be generated separately
        createdAt: new Date().toISOString(),
        // Learning science metadata
        bloomsLevel: chunk.bloomsLevel || "understand",
        learningObjectiveAlignment: chunk.learningObjectiveAlignment || [],
        cognitiveLoad: chunk.cognitiveLoad || "medium",
        reinforcementStrategy: chunk.reinforcementStrategy || "",
        assessmentType: chunk.assessmentType || "none",
        interactionLevel: chunk.interactionLevel || "active",
      }));

      if (CONFIG.DEBUG.ENABLED) {
        console.log(
          `Generated ${processedChunks.length} chunks with learning science principles`
        );
        console.log(
          "Bloom's distribution:",
          this.analyzeBloomsDistribution(processedChunks)
        );
      }

      return processedChunks;
    } catch (error) {
      console.error("Error generating chunks:", error);
      throw new Error(`Failed to generate chunks: ${error.message}`);
    }
  }

  /**
   * Generate content for a specific chunk using AI
   */
  async generateSlideContent(chunk, courseConfig) {
    await this.ensureReady();

    if (CONFIG.DEBUG.ENABLED) {
      console.log("Generating AI content for chunk:", chunk.title);
    }

    try {
      // Determine Bloom's level for this chunk
      const bloomsLevel =
        chunk.bloomsLevel ||
        this.coursePrompts.classifyBloomsLevel(chunk.groundTruth);

      // Generate pedagogically optimized prompt
      const prompt = this.coursePrompts.generateSlideContentPrompt(
        chunk,
        courseConfig,
        bloomsLevel,
        [] // TODO: Pass previous chunks for reinforcement
      );

      const response = await this.makeAPICall(prompt, {
        maxTokens: 2000,
        temperature: 0.7,
      });

      // Parse JSON response
      let content;
      try {
        content = JSON.parse(response);
      } catch (parseError) {
        // Try to extract JSON from response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          content = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("Could not parse JSON response from AI");
        }
      }

      // Validate content structure based on slide type
      this.validateSlideContent(content, chunk.slideType);

      if (CONFIG.DEBUG.ENABLED) {
        console.log(
          `Generated ${chunk.slideType} content for "${chunk.title}"`
        );
      }

      return content;
    } catch (error) {
      console.error("Error generating slide content:", error);
      throw new Error(
        `Failed to generate content for "${chunk.title}": ${error.message}`
      );
    }
  }

  /**
   * Validate slide content structure
   */
  validateSlideContent(content, slideType) {
    const requiredFields = {
      title: ["header", "text"],
      courseInfo: ["header", "text", "duration"],
      textAndBullets: ["header", "text", "bullets"],
      textAndImage: ["header", "text"],
      multipleChoice: ["question", "options", "correctAnswer"],
      iconsWithTitles: ["header", "icons"],
      tabs: [], // Array format
      flipCards: [], // Array format
      faq: ["header", "items"],
      popups: [], // Array format
    };

    const required = requiredFields[slideType];
    if (!required) return; // Unknown slide type, skip validation

    if (Array.isArray(required)) {
      // Object structure validation
      for (const field of required) {
        if (!(field in content)) {
          throw new Error(
            `Missing required field '${field}' for slide type '${slideType}'`
          );
        }
      }
    } else {
      // Array structure validation
      if (!Array.isArray(content)) {
        throw new Error(
          `Content for slide type '${slideType}' should be an array`
        );
      }
    }
  }

  /**
   * Analyze Bloom's taxonomy distribution
   */
  analyzeBloomsDistribution(chunks) {
    const distribution = {};
    chunks.forEach((chunk) => {
      const level = chunk.bloomsLevel || "understand";
      distribution[level] = (distribution[level] || 0) + 1;
    });
    return distribution;
  }

  /**
   * Validate course configuration
   */
  validateCourseConfig(config) {
    const errors = [];

    if (!config.title || config.title.trim().length < 3) {
      errors.push("Course title must be at least 3 characters");
    }

    if (!config.learningObjectives || config.learningObjectives.length === 0) {
      errors.push("At least one learning objective is required");
    }

    if (!config.sourceContent || config.sourceContent.trim().length < 100) {
      errors.push("Source content must be at least 100 characters");
    }

    if (!config.targetAudience || config.targetAudience.trim().length === 0) {
      errors.push("Target audience must be specified");
    }

    return {
      valid: errors.length === 0,
      errors: errors,
    };
  }

  /**
   * Get processing status
   */
  getProcessingStatus() {
    return {
      isReady: this.isReady,
      isProcessing: false,
      canGenerateChunks: this.isReady,
      canGenerateContent: this.isReady,
      apiConnected: this.apiKey !== null,
      model: this.model,
      maxTokens: this.maxTokens,
    };
  }

  /**
   * Get service health information
   */
  async getHealthCheck() {
    try {
      await this.ensureReady();

      return {
        status: "healthy",
        apiConnected: true,
        model: this.model,
        maxTokens: this.maxTokens,
        lastCheck: new Date().toISOString(),
        features: {
          learningScience: true,
          realAI: true,
          pedagogicalOptimization: true,
        },
      };
    } catch (error) {
      return {
        status: "unhealthy",
        error: error.message,
        lastCheck: new Date().toISOString(),
      };
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.isReady = false;
    this.apiKey = null;
    this.coursePrompts = null;

    if (CONFIG.DEBUG.ENABLED) {
      console.log("SimpleLLMService cleaned up");
    }
  }
}
