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
    this.maxTokens = 10000;
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
   * Generate initial chunks using three-pass workflow
   * Pass 1: Structure, Pass 2: Content, Pass 3: Format
   */
  async generateChunks(courseConfig) {
    await this.ensureReady();

    if (CONFIG.DEBUG.ENABLED) {
      console.log(
        "Starting three-pass chunk generation for:",
        courseConfig.title
      );
    }

    // Validate configuration
    const validation = this.validateCourseConfig(courseConfig);
    if (!validation.valid) {
      throw new Error(`Invalid course config: ${validation.errors.join("; ")}`);
    }

    try {
      // Calculate optimal chunk count
      const chunkInfo = this.coursePrompts.calculateOptimalChunkCount(
        courseConfig.estimatedDuration
      );

      if (CONFIG.DEBUG.ENABLED) {
        console.log("Chunk calculation:", chunkInfo);
      }

      // PASS 1: Generate course structure
      const chunkStructures = await this.generateChunkStructures(
        courseConfig,
        chunkInfo.totalChunks
      );

      // PASS 2: Develop content for each chunk
      const chunksWithContent = await this.generateChunkContents(
        chunkStructures,
        courseConfig
      );

      // PASS 3: Determine optimal slide types (we'll do this later in generateSlideContent)
      const finalChunks = this.finalizeChunks(chunksWithContent, chunkInfo);

      if (CONFIG.DEBUG.ENABLED) {
        console.log(
          `Generated ${finalChunks.length} chunks using three-pass workflow`
        );
        console.log(
          "Bloom's distribution:",
          this.analyzeBloomsDistribution(finalChunks)
        );
      }

      return finalChunks;
    } catch (error) {
      console.error("Error in three-pass chunk generation:", error);
      throw new Error(`Failed to generate chunks: ${error.message}`);
    }
  }

  /**
   * PASS 1: Generate chunk structures/outlines
   */
  async generateChunkStructures(courseConfig, targetChunkCount) {
    if (CONFIG.DEBUG.ENABLED) {
      console.log(
        `Pass 1: Generating structure for ${targetChunkCount} chunks`
      );
    }

    const prompt = this.coursePrompts.generateChunkStructurePrompt(
      courseConfig,
      targetChunkCount
    );

    const response = await this.makeAPICall(prompt, {
      maxTokens: 3000,
      temperature: 0.8,
    });

    // Parse JSON response
    let structureData;
    try {
      structureData = JSON.parse(response);
    } catch (parseError) {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        structureData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not parse structure JSON from AI");
      }
    }

    if (!structureData.courseStructure?.chunks) {
      throw new Error("Invalid structure data from AI");
    }

    return structureData.courseStructure.chunks;
  }

  /**
   * PASS 2: Generate detailed content for each chunk
   */
  async generateChunkContents(chunkStructures, courseConfig) {
    if (CONFIG.DEBUG.ENABLED) {
      console.log(
        `Pass 2: Generating content for ${chunkStructures.length} chunks`
      );
    }

    const chunksWithContent = [];

    for (let i = 0; i < chunkStructures.length; i++) {
      const structure = chunkStructures[i];

      // Update progress if StatusManager is available
      if (
        typeof StatusManager !== "undefined" &&
        typeof StatusManager.updateBatch === "function"
      ) {
        StatusManager.updateBatch(
          `Pass 2: Developing content for "${structure.title}" (${i + 1}/${
            chunkStructures.length
          })`
        );
      }

      if (CONFIG.DEBUG.ENABLED) {
        console.log(
          `Generating content for chunk ${i + 1}: "${structure.title}"`
        );
      }

      // Generate detailed content with context of other chunks
      const prompt = this.coursePrompts.generateChunkContentPrompt(
        structure,
        courseConfig,
        chunkStructures,
        i
      );

      const response = await this.makeAPICall(prompt, {
        maxTokens: 2500,
        temperature: 0.7,
      });

      // Parse content response
      let contentData;
      try {
        contentData = JSON.parse(response);
      } catch (parseError) {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          contentData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error(`Could not parse content JSON for chunk ${i + 1}`);
        }
      }

      if (!contentData.chunkContent) {
        throw new Error(`Invalid content data for chunk ${i + 1}`);
      }

      // Combine structure and content
      const fullChunk = {
        ...structure,
        ...contentData.chunkContent,
        order: i,
      };

      chunksWithContent.push(fullChunk);

      // Small delay to avoid rate limiting
      if (i < chunkStructures.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    return chunksWithContent;
  }

  /**
   * Finalize chunks with metadata
   */
  finalizeChunks(chunksWithContent, chunkInfo) {
    return chunksWithContent.map((chunk, index) => ({
      id: `chunk-${Date.now()}-${index}`,
      title: chunk.title,
      slideType: this.selectInitialSlideType(chunk),
      sourceContent: chunk.sourceContent || "",
      groundTruth: chunk.groundTruth || "",
      estimatedTime:
        chunk.estimatedTime || `${chunkInfo.averageChunkTime} minutes`,
      order: index,
      isLocked: false,
      generatedContent: null, // Will be generated in Pass 3
      createdAt: new Date().toISOString(),
      // Learning science metadata
      bloomsLevel: chunk.bloomsLevel || "understand",
      learningObjectiveAlignment: chunk.learningObjectiveAlignment || [],
      cognitiveLoad: chunk.cognitiveLoad || "medium",
      reinforcementStrategy: chunk.reinforcementStrategy || "",
      assessmentType: chunk.assessmentType || "none",
      interactionLevel: chunk.interactionLevel || "active",
      connectionToPrevious: chunk.connectionToPrevious || "",
      connectionToNext: chunk.connectionToNext || "",
      keyTakeaways: chunk.keyTakeaways || [],
    }));
  }

  /**
   * Select initial slide type based on content and learning science
   */
  selectInitialSlideType(chunk) {
    const bloomsLevel = chunk.bloomsLevel || "understand";
    const assessmentType = chunk.assessmentType || "none";

    // Special cases first
    if (
      chunk.title.toLowerCase().includes("welcome") ||
      chunk.title.toLowerCase().includes("introduction")
    ) {
      return "title";
    }

    if (
      chunk.title.toLowerCase().includes("overview") ||
      chunk.title.toLowerCase().includes("objectives")
    ) {
      return "courseInfo";
    }

    if (assessmentType === "formative" || assessmentType === "summative") {
      return "multipleChoice";
    }

    // Based on Bloom's level
    switch (bloomsLevel) {
      case "remember":
        return "flipCards";
      case "understand":
        return "textAndImage";
      case "apply":
        return "textAndBullets";
      case "analyze":
        return "tabs";
      case "evaluate":
        return "faq";
      case "create":
        return "iconsWithTitles";
      default:
        return "textAndBullets";
    }
  }

  /**
   * PASS 3: Generate optimized slide content for specific slide type
   */
  async generateSlideContent(chunk, courseConfig) {
    await this.ensureReady();

    if (CONFIG.DEBUG.ENABLED) {
      console.log(
        `Pass 3: Generating optimized ${chunk.slideType} content for "${chunk.title}"`
      );
    }

    try {
      // Use Pass 3 prompt for format optimization
      const prompt = this.coursePrompts.generateSlideFormatPrompt(
        chunk,
        chunk.slideType,
        courseConfig
      );

      const response = await this.makeAPICall(prompt, {
        maxTokens: 2000,
        temperature: 0.7,
      });

      // Parse JSON response
      let content;
      try {
        const parsed = JSON.parse(response);
        content = parsed.slideContent || parsed;
      } catch (parseError) {
        // Try to extract JSON from response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          content = parsed.slideContent || parsed;
        } else {
          throw new Error("Could not parse JSON response from AI");
        }
      }

      // Validate content structure based on slide type
      this.validateSlideContent(content, chunk.slideType);

      if (CONFIG.DEBUG.ENABLED) {
        console.log(
          `Generated optimized ${chunk.slideType} content for "${chunk.title}"`
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
