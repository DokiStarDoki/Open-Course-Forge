/**
 * Course Forge MVP - LLM Service
 * Handles communication with AI models via OpenRouter API
 * FIXED: JSON parsing issues, performance improvements, better error handling
 */

class LLMService {
  constructor() {
    this.apiKey = null;
    this.apiUrl = null;
    this.isReady = false;
    this.initializationPromise = null;

    // Start initialization but don't block constructor
    this.initializationPromise = this.initializeAPI();
  }

  /**
   * Initialize API configuration
   */
  async initializeAPI() {
    try {
      // Check if we're in development and have local config
      if (this.isDevelopment()) {
        await this.loadLocalConfig();
      }

      // Set API URL based on environment
      this.apiUrl = this.getAPIUrl();

      // Validate setup
      this.validateSetup();

      this.isReady = true;

      if (CONFIG.DEBUG.ENABLED) {
        console.log("LLMService initialized successfully");
        console.log("API URL:", this.apiUrl);
        console.log("Using proxy:", this.isUsingProxy());
        console.log("Has API key:", !!this.apiKey);
      }
    } catch (error) {
      console.error("Failed to initialize LLMService:", error);

      // Show user-friendly error message
      if (this.isDevelopment() && !this.apiKey) {
        StatusManager.showError(
          "Please create js/local.config.js with your OpenRouter API key to use AI features"
        );
      } else {
        StatusManager.showError(
          "AI service initialization failed. AI features may not work."
        );
      }

      // Don't throw - let the app continue without AI features
      this.isReady = false;
    }
  }

  /**
   * Ensure service is ready before making requests
   */
  async ensureReady() {
    if (!this.initializationPromise) {
      throw new Error("LLM Service not initialized");
    }

    await this.initializationPromise;

    if (!this.isReady) {
      throw new Error("LLM Service failed to initialize");
    }
  }

  /**
   * Check if running in development
   */
  isDevelopment() {
    return (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname.includes("localhost")
    );
  }

  /**
   * Load local configuration (development only)
   */
  async loadLocalConfig() {
    if (!this.isDevelopment()) return;

    try {
      // Wait for local config to load (similar to your game setup)
      await this.waitForLocalConfig();

      if (window.LOCAL_CONFIG && window.LOCAL_CONFIG.OPENROUTER_API_KEY) {
        this.apiKey = window.LOCAL_CONFIG.OPENROUTER_API_KEY;
        console.log("✅ Local API key loaded");
      }
    } catch (error) {
      console.warn("⚠️ Local config not available, will use proxy");
    }
  }

  /**
   * Wait for local config to load
   */
  async waitForLocalConfig(timeoutMs = 3000) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      if (window.LOCAL_CONFIG && window.LOCAL_CONFIG.OPENROUTER_API_KEY) {
        return true;
      }
      await this.wait(100);
    }

    return false;
  }

  /**
   * Get API URL based on environment
   */
  getAPIUrl() {
    if (this.isDevelopment()) {
      if (this.apiKey) {
        // In development with local API key, use direct connection
        return "https://openrouter.ai/api/v1/chat/completions";
      } else {
        // In development without API key, try to use a proxy if available
        // You can update this URL to match your actual proxy deployment
        return "https://your-vercel-deployment.vercel.app/api/chat";
      }
    } else {
      // Use relative proxy path for production
      return "/api/chat";
    }
  }

  /**
   * Check if using proxy
   */
  isUsingProxy() {
    return this.apiUrl.includes("/api/chat");
  }

  /**
   * Validate API setup
   */
  validateSetup() {
    if (this.isUsingProxy()) {
      // For proxy, we need to check if the proxy URL is accessible
      // But we can't easily do this without making a request
      console.log("Using proxy URL:", this.apiUrl);
      return true;
    } else if (!this.apiKey) {
      console.warn(
        "No API key available. Please set up local.config.js with your OpenRouter API key."
      );
      console.warn(
        'Example: window.LOCAL_CONFIG = { OPENROUTER_API_KEY: "sk-or-v1-your-key-here" };'
      );
      throw new Error("No API key available and proxy not properly configured");
    }
    return true;
  }

  /**
   * Make API request to LLM with improved error handling
   */
  async makeRequest(messages, options = {}) {
    await this.ensureReady();

    const requestBody = {
      model: options.model || CONFIG.AI_MODELS.DEEPSEEK_R1,
      messages: messages,
      max_tokens: options.maxTokens || 4000,
      temperature: options.temperature || 0.7,
      top_p: options.topP || 0.9,
      stream: false,
      // Add specific parameters to encourage better JSON formatting
      stop: options.stop || null,
      presence_penalty: 0.1, // Encourage variety in responses
      frequency_penalty: 0.1, // Reduce repetition
    };

    const requestOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    };

    // Add authorization header if using direct API
    if (!this.isUsingProxy() && this.apiKey) {
      requestOptions.headers["Authorization"] = `Bearer ${this.apiKey}`;
      requestOptions.headers["HTTP-Referer"] = window.location.origin;
      requestOptions.headers["X-Title"] = "Course Forge MVP";
    }

    try {
      if (CONFIG.DEBUG.ENABLED) {
        console.log("Making LLM request:", {
          url: this.apiUrl,
          model: requestBody.model,
          messageCount: messages.length,
          usingProxy: this.isUsingProxy(),
          temperature: requestBody.temperature,
        });
      }

      const response = await fetch(this.apiUrl, requestOptions);

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `API request failed: ${response.status} ${response.statusText}`;

        // Provide more specific error messages
        switch (response.status) {
          case 400:
            errorMessage = "Invalid request format. Please try again.";
            break;
          case 401:
            errorMessage =
              "Invalid API key. Please check your OpenRouter API key configuration.";
            break;
          case 429:
            errorMessage = "Rate limit exceeded. Please try again in a moment.";
            break;
          case 500:
            errorMessage =
              "AI service temporarily unavailable. Please try again.";
            break;
          case 503:
            errorMessage =
              "AI model is currently overloaded. Please try again in a few moments.";
            break;
          default:
            if (errorText.includes("content_policy")) {
              errorMessage =
                "Content was flagged by AI safety filters. Please try rephrasing your request.";
            }
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (CONFIG.DEBUG.ENABLED) {
        console.log("LLM response received:", {
          model: data.model,
          usage: data.usage,
          hasChoices: !!data.choices && data.choices.length > 0,
          responseLength: data.choices?.[0]?.message?.content?.length || 0,
        });
      }

      if (!data.choices || data.choices.length === 0) {
        throw new Error("No response generated by AI model");
      }

      return data;
    } catch (error) {
      console.error("LLM request failed:", error);

      // Enhanced error context
      if (error.message.includes("JSON")) {
        throw new Error(`AI response formatting error: ${error.message}`);
      } else if (error.message.includes("timeout")) {
        throw new Error(
          "AI request timed out. Please try again with simpler content."
        );
      } else if (error.message.includes("fetch")) {
        throw new Error(
          "Network error. Please check your internet connection."
        );
      }

      throw new Error(`Failed to get AI response: ${error.message}`);
    }
  }

  /**
   * Generate content chunks from source material with retry logic
   */
  async generateChunks(courseConfig) {
    const maxRetries = 2;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const systemPrompt = this.buildChunkingSystemPrompt();
        const userPrompt = this.buildChunkingUserPrompt(courseConfig);

        const messages = [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ];

        // Adjust temperature based on attempt (more deterministic on retries)
        const temperature = attempt === 1 ? 0.3 : 0.1;

        const response = await this.makeRequest(messages, {
          temperature: temperature,
          maxTokens: 3000,
        });

        if (!response.choices || response.choices.length === 0) {
          throw new Error("No response choices received from AI");
        }

        const content = response.choices[0].message.content;

        // Log raw response for debugging
        if (CONFIG.DEBUG.ENABLED) {
          console.log(`Attempt ${attempt} - Raw AI response:`, content);
        }

        return this.parseChunkingResponse(content);
      } catch (error) {
        lastError = error;
        console.warn(`Chunking attempt ${attempt} failed:`, error.message);

        if (attempt < maxRetries) {
          console.log(
            `Retrying chunking (attempt ${attempt + 1}/${maxRetries})...`
          );
          // Wait before retry
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    throw new Error(
      `Chunking failed after ${maxRetries} attempts: ${lastError.message}`
    );
  }

  /**
   * Generate content for a specific chunk
   */
  async generateSlideContent(chunk, courseConfig) {
    const systemPrompt = this.buildContentSystemPrompt();
    const userPrompt = this.buildContentUserPrompt(chunk, courseConfig);

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    try {
      const response = await this.makeRequest(messages, {
        temperature: 0.4,
        maxTokens: 10000,
      });

      if (!response.choices || response.choices.length === 0) {
        throw new Error("No response choices received from AI");
      }

      const content = response.choices[0].message.content;
      return this.parseContentResponse(content, chunk.slideType);
    } catch (error) {
      console.error("Content generation failed:", error);
      throw new Error(`Content generation failed: ${error.message}`);
    }
  }

  /**
   * Build system prompt for chunking with stronger JSON formatting instructions
   */
  buildChunkingSystemPrompt() {
    return `You are an expert instructional designer specializing in creating structured, engaging eLearning courses. Your task is to analyze source content and break it down into logical chunks that will become individual slides in a Rise 360-style course.

CRITICAL: You MUST respond with ONLY a valid JSON array. No explanations, no markdown, no extra text - just the JSON array.

Your response must be EXACTLY in this format:
[
  {
    "title": "Clear descriptive title",
    "slideType": "textAndImage",
    "sourceContent": "relevant excerpt from source material",
    "estimatedTime": "2 minutes",
    "order": 0
  }
]

IMPORTANT JSON RULES:
- Use ONLY double quotes (") for all strings
- NO escaped quotes (\") in string values
- NO single quotes (') anywhere
- NO trailing commas
- Ensure proper array structure with square brackets []
- Each object must have exactly these 5 properties: title, slideType, sourceContent, estimatedTime, order

Available slide types (use EXACTLY these values):
- "textAndImage": For concepts that benefit from visual support
- "textAndBullets": For lists, steps, or key points
- "iconsWithTitles": For 3-4 main principles or categories
- "multipleChoice": For knowledge checks and assessments
- "tabs": For comparing different approaches or roles
- "flipCards": For definitions, terms, or before/after scenarios
- "faq": For common questions and answers
- "popups": For additional resources or deep-dive information

Chunking Guidelines:
1. Create 5-8 chunks for optimal learning
2. Each chunk should cover one main concept
3. Include 1-2 knowledge checks (multipleChoice) every 3-4 content chunks
4. Start with overview/introduction
5. End with summary or next steps
6. Vary slide types for engagement
7. Keep estimatedTime as "1 minutes", "2 minutes", or "3 minutes"
8. Set order as sequential numbers: 0, 1, 2, 3, etc.

Example valid response:
[
  {
    "title": "Introduction to Game Development",
    "slideType": "textAndImage",
    "sourceContent": "Game development combines creativity with technical skills...",
    "estimatedTime": "2 minutes",
    "order": 0
  },
  {
    "title": "Key Game Design Principles",
    "slideType": "textAndBullets", 
    "sourceContent": "Essential principles include player engagement, iterative design...",
    "estimatedTime": "3 minutes",
    "order": 1
  }
]

Remember: Respond with ONLY the JSON array, nothing else.`;
  }

  /**
   * Build user prompt with better structure for JSON response
   */
  buildChunkingUserPrompt(courseConfig) {
    return `Please analyze the following course information and create a JSON array of chunks:

COURSE TITLE: ${courseConfig.title}

TARGET AUDIENCE: ${courseConfig.targetAudience || "Professional learners"}

ESTIMATED DURATION: ${courseConfig.estimatedDuration || "30-45 minutes"}

LEARNING OBJECTIVES:
${courseConfig.learningObjectives.map((obj) => `- ${obj}`).join("\n")}

SOURCE CONTENT:
${courseConfig.sourceContent.substring(0, 3000)}${
      courseConfig.sourceContent.length > 3000 ? "... [content truncated]" : ""
    }

ADDITIONAL GUIDANCE:
${
  courseConfig.additionalGuidance ||
  "Create an engaging, well-structured course that meets the learning objectives."
}

Return ONLY a valid JSON array of 5-8 chunks with the exact structure specified in the system prompt.`;
  }

  /**
   * Build system prompt for content generation
   */
  buildContentSystemPrompt() {
    return `You are an expert instructional designer creating content for a specific slide type in a Rise 360-style eLearning course. 

IMPORTANT: You must respond with ONLY a valid JSON object. No additional text, explanations, or markdown formatting.

Your response must match the exact structure required for the slide type:

For "textAndImage":
{
  "header": "Slide title",
  "text": "Main content paragraph",
  "image": "https://images.unsplash.com/photo-[relevant-image]?w=500&h=300&fit=crop",
  "audioScript": "Script for audio narration"
}

For "textAndBullets":
{
  "header": "Slide title", 
  "text": "Introduction paragraph",
  "bullets": ["Bullet point 1", "Bullet point 2", "Bullet point 3"],
  "audioScript": "Script for audio narration"
}

For "iconsWithTitles":
{
  "header": "Slide title",
  "icons": [
    {"icon": "target", "title": "Title 1", "description": "Description 1"},
    {"icon": "users", "title": "Title 2", "description": "Description 2"},
    {"icon": "trending-up", "title": "Title 3", "description": "Description 3"}
  ],
  "audioScript": "Script for audio narration"
}

For "multipleChoice":
{
  "question": "Question text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": 0,
  "feedback": {
    "correct": "Explanation for correct answer",
    "incorrect": "Explanation and learning opportunity"
  },
  "audioScript": "Script for audio narration"
}

For "tabs":
[
  {"title": "Tab 1", "content": "Content for tab 1"},
  {"title": "Tab 2", "content": "Content for tab 2"},
  {"title": "Tab 3", "content": "Content for tab 3"}
]

For "flipCards":
[
  {"front": "Term or concept", "back": "Definition or explanation"},
  {"front": "Another term", "back": "Another explanation"}
]

For "faq":
{
  "header": "FAQ Section Title",
  "items": [
    {"question": "Question 1?", "answer": "Answer 1"},
    {"question": "Question 2?", "answer": "Answer 2"}
  ],
  "audioScript": "Script for audio narration"
}

For "popups":
[
  {"title": "Resource 1", "content": "Detailed content for popup 1"},
  {"title": "Resource 2", "content": "Detailed content for popup 2"}
]

Content Guidelines:
- Keep content concise and focused
- Use professional, conversational tone
- Include specific, actionable information
- For images, use relevant Unsplash photo URLs
- Audio scripts should be 15-30 seconds when read aloud
- Make multiple choice questions scenario-based
- Ensure flip cards have clear, useful definitions

Remember: Respond with ONLY the JSON object, nothing else.`;
  }

  /**
   * Build user prompt for content generation
   */
  buildContentUserPrompt(chunk, courseConfig) {
    return `Generate content for a "${
      chunk.slideType
    }" slide with the following details:

SLIDE TITLE: ${chunk.title}

COURSE CONTEXT:
- Course: ${courseConfig.title}
- Target Audience: ${courseConfig.targetAudience || "Professional learners"}
- Learning Objectives: ${courseConfig.learningObjectives.join(", ")}

SOURCE CONTENT FOR THIS SLIDE:
${chunk.sourceContent}

ADDITIONAL GUIDANCE:
${
  courseConfig.additionalGuidance ||
  "Create engaging, practical content that helps learners achieve the objectives."
}

Create a JSON object with content specifically formatted for the "${
      chunk.slideType
    }" slide type.`;
  }

  /**
   * Parse chunking response from AI with robust error handling
   */
  parseChunkingResponse(content) {
    try {
      if (CONFIG.DEBUG.ENABLED) {
        console.log("Raw LLM response:", content);
      }

      // Clean up the response - remove any markdown formatting and fix common issues
      let cleanContent = content
        .replace(/```json\s*|\s*```/g, "") // Remove markdown code blocks
        .replace(/^[^[{]*/, "") // Remove any text before the JSON starts
        .replace(/[^}\]]*$/, "") // Remove any text after the JSON ends
        .trim();

      // Fix common JSON formatting issues from LLM responses
      cleanContent = this.fixJsonFormatting(cleanContent);

      if (CONFIG.DEBUG.ENABLED) {
        console.log("Cleaned response:", cleanContent);
      }

      // Attempt to parse
      let chunks;
      try {
        chunks = JSON.parse(cleanContent);
      } catch (parseError) {
        // Try additional cleanup if first parse fails
        console.warn(
          "Initial JSON parse failed, attempting advanced cleanup..."
        );
        cleanContent = this.advancedJsonCleanup(cleanContent);
        chunks = JSON.parse(cleanContent);
      }

      if (!Array.isArray(chunks)) {
        throw new Error("Response is not an array");
      }

      // Validate and enhance chunks
      return chunks.map((chunk, index) => {
        // Validate required fields
        if (!chunk.title) {
          console.warn(`Chunk ${index} missing title, using default`);
          chunk.title = `Chunk ${index + 1}`;
        }

        if (
          !chunk.slideType ||
          !CONFIG.SLIDE_TYPES.some((type) => type.value === chunk.slideType)
        ) {
          console.warn(
            `Chunk ${index} has invalid slideType: ${chunk.slideType}, using default`
          );
          chunk.slideType = "textAndImage";
        }

        return {
          id: `chunk-${Date.now()}-${index}-${Math.floor(
            Math.random() * 1000
          )}`,
          title: chunk.title,
          slideType: chunk.slideType,
          sourceContent: chunk.sourceContent || "",
          estimatedTime: chunk.estimatedTime || "2 minutes",
          order: typeof chunk.order === "number" ? chunk.order : index,
          isLocked: false,
          generatedContent: null,
          createdAt: new Date().toISOString(),
        };
      });
    } catch (error) {
      console.error("Failed to parse chunking response:", error);
      console.error("Original content:", content);

      // Return a fallback response instead of throwing
      return this.generateFallbackChunks(content);
    }
  }

  /**
   * Fix common JSON formatting issues from LLM responses
   */
  fixJsonFormatting(content) {
    return (
      content
        // Fix escaped quotes in JSON values
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'")

        // Fix missing commas between objects
        .replace(/}\s*{/g, "},{")

        // Fix trailing commas
        .replace(/,(\s*[}\]])/g, "$1")

        // Fix single quotes to double quotes for property names
        .replace(/'([^']+)':/g, '"$1":')

        // Fix unescaped quotes within string values
        .replace(/"([^"]*)"([^"]*)"([^"]*)":/g, (match, p1, p2, p3) => {
          return `"${p1}${p2}${p3}":`;
        })

        // Remove any null bytes or other problematic characters
        .replace(/\0/g, "")
        .replace(/[\x00-\x1F\x7F]/g, "")
    );
  }

  /**
   * Advanced JSON cleanup for severely malformed responses
   */
  advancedJsonCleanup(content) {
    try {
      // Try to extract JSON objects using regex
      const objectMatches = content.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);

      if (objectMatches && objectMatches.length > 0) {
        const cleanObjects = objectMatches.map((obj) => {
          // Clean each object individually
          return obj
            .replace(/\\"/g, '"')
            .replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":') // Add quotes to property names
            .replace(/:\s*'([^']*)'/g, ': "$1"') // Convert single quotes to double quotes
            .replace(/,(\s*[}\]])/g, "$1"); // Remove trailing commas
        });

        return "[" + cleanObjects.join(",") + "]";
      }

      // If regex approach fails, try line-by-line reconstruction
      return this.reconstructJson(content);
    } catch (error) {
      console.error("Advanced cleanup failed:", error);
      throw new Error("Could not repair malformed JSON response");
    }
  }

  /**
   * Reconstruct JSON from severely damaged response
   */
  reconstructJson(content) {
    const lines = content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line);
    const objects = [];
    let currentObj = {};
    let inObject = false;

    for (const line of lines) {
      if (line.includes("{") || line.includes('"title"')) {
        if (inObject && Object.keys(currentObj).length > 0) {
          objects.push(currentObj);
        }
        currentObj = {};
        inObject = true;
      }

      // Extract key-value pairs
      const keyValueMatch = line.match(/"?([^":\s]+)"?\s*:\s*"?([^",}]+)"?/);
      if (keyValueMatch && inObject) {
        const [, key, value] = keyValueMatch;
        currentObj[key.replace(/"/g, "")] = value
          .replace(/"/g, "")
          .replace(/,$/, "");
      }

      if (line.includes("}")) {
        if (Object.keys(currentObj).length > 0) {
          objects.push(currentObj);
        }
        inObject = false;
      }
    }

    return JSON.stringify(objects);
  }

  /**
   * Generate fallback chunks when parsing completely fails
   */
  generateFallbackChunks(originalContent) {
    console.warn("Generating fallback chunks due to parsing failure");

    // Try to extract at least the titles from the malformed response
    const titleMatches = originalContent.match(/"title":\s*"([^"]+)"/g);
    const titles = titleMatches
      ? titleMatches.map((match) => match.match(/"title":\s*"([^"]+)"/)[1])
      : [];

    if (titles.length > 0) {
      return titles.map((title, index) => ({
        id: `fallback-chunk-${Date.now()}-${index}`,
        title: title,
        slideType: "textAndImage",
        sourceContent: "Content extracted from malformed AI response",
        estimatedTime: "2 minutes",
        order: index,
        isLocked: false,
        generatedContent: null,
        createdAt: new Date().toISOString(),
      }));
    }

    // Last resort: create generic chunks
    return [
      {
        id: `fallback-chunk-${Date.now()}-0`,
        title: "Introduction",
        slideType: "textAndImage",
        sourceContent: "AI response parsing failed - please edit this chunk",
        estimatedTime: "2 minutes",
        order: 0,
        isLocked: false,
        generatedContent: null,
        createdAt: new Date().toISOString(),
      },
      {
        id: `fallback-chunk-${Date.now()}-1`,
        title: "Main Content",
        slideType: "textAndBullets",
        sourceContent: "AI response parsing failed - please edit this chunk",
        estimatedTime: "3 minutes",
        order: 1,
        isLocked: false,
        generatedContent: null,
        createdAt: new Date().toISOString(),
      },
      {
        id: `fallback-chunk-${Date.now()}-2`,
        title: "Summary",
        slideType: "textAndImage",
        sourceContent: "AI response parsing failed - please edit this chunk",
        estimatedTime: "2 minutes",
        order: 2,
        isLocked: false,
        generatedContent: null,
        createdAt: new Date().toISOString(),
      },
    ];
  }

  /**
   * Parse content response from AI
   */
  parseContentResponse(content, slideType) {
    try {
      // Clean up the response
      const cleanContent = content.replace(/```json\s*|\s*```/g, "").trim();

      const parsedContent = JSON.parse(cleanContent);

      // Validate the structure based on slide type
      this.validateContentStructure(parsedContent, slideType);

      return parsedContent;
    } catch (error) {
      console.error("Failed to parse content response:", error);
      console.error("Raw response:", content);
      throw new Error(`Invalid content response format: ${error.message}`);
    }
  }

  /**
   * Validate content structure
   */
  validateContentStructure(content, slideType) {
    const requiredFields = {
      textAndImage: ["header", "text", "image"],
      textAndBullets: ["header", "text", "bullets"],
      iconsWithTitles: ["header", "icons"],
      multipleChoice: ["question", "options", "correctAnswer", "feedback"],
      tabs: [], // Array format
      flipCards: [], // Array format
      faq: ["header", "items"],
      popups: [], // Array format
    };

    const required = requiredFields[slideType] || [];

    for (const field of required) {
      if (!content.hasOwnProperty(field)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
  }

  /**
   * Utility function to wait
   */
  async wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isReady: this.isReady,
      apiUrl: this.apiUrl,
      usingProxy: this.isUsingProxy(),
      hasApiKey: !!this.apiKey,
    };
  }
}

// Export for use in other modules
window.LLMService = LLMService;
