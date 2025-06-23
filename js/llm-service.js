/**
 * Course Forge MVP - LLM Service
 * Handles communication with AI models via OpenRouter API
 */

class LLMService {
  constructor() {
    this.apiKey = null;
    this.apiUrl = null;
    this.isReady = false;

    this.initializeAPI();
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
   * Make API request to LLM
   */
  async makeRequest(messages, options = {}) {
    if (!this.isReady) {
      throw new Error(
        "LLM Service not properly initialized. Please check your configuration."
      );
    }

    const requestBody = {
      model: options.model || CONFIG.AI_MODELS.DEEPSEEK_R1,
      messages: messages,
      max_tokens: options.maxTokens || 4000,
      temperature: options.temperature || 0.7,
      top_p: options.topP || 0.9,
      stream: false,
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
        });
      }

      const response = await fetch(this.apiUrl, requestOptions);

      if (!response.ok) {
        const errorText = await response.text();

        // Provide more specific error messages
        if (response.status === 405) {
          throw new Error(
            "API endpoint not available. Please check your configuration or set up a local API key."
          );
        } else if (response.status === 401) {
          throw new Error(
            "Invalid API key. Please check your OpenRouter API key configuration."
          );
        } else if (response.status === 429) {
          throw new Error("Rate limit exceeded. Please try again in a moment.");
        } else {
          throw new Error(
            `API request failed: ${response.status} ${response.statusText} - ${errorText}`
          );
        }
      }

      const data = await response.json();

      if (CONFIG.DEBUG.ENABLED) {
        console.log("LLM response received:", {
          model: data.model,
          usage: data.usage,
          hasChoices: !!data.choices && data.choices.length > 0,
        });
      }

      return data;
    } catch (error) {
      console.error("LLM request failed:", error);
      throw new Error(`Failed to get AI response: ${error.message}`);
    }
  }

  /**
   * Generate content chunks from source material
   */
  async generateChunks(courseConfig) {
    const systemPrompt = this.buildChunkingSystemPrompt();
    const userPrompt = this.buildChunkingUserPrompt(courseConfig);

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    try {
      const response = await this.makeRequest(messages, {
        temperature: 0.3, // Lower temperature for more consistent chunking
        maxTokens: 3000,
      });

      if (!response.choices || response.choices.length === 0) {
        throw new Error("No response choices received from AI");
      }

      const content = response.choices[0].message.content;
      return this.parseChunkingResponse(content);
    } catch (error) {
      console.error("Chunking generation failed:", error);
      throw new Error(`Chunking failed: ${error.message}`);
    }
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
   * Build system prompt for chunking
   */
  buildChunkingSystemPrompt() {
    return `You are an expert instructional designer specializing in creating structured, engaging eLearning courses. Your task is to analyze source content and break it down into logical chunks that will become individual slides in a Rise 360-style course.

IMPORTANT: You must respond with ONLY a valid JSON array. No additional text, explanations, or markdown formatting.

Your response should be a JSON array where each object represents a chunk with this exact structure:
{
  "title": "Clear, descriptive title for the chunk",
  "slideType": "recommended slide type",
  "sourceContent": "relevant excerpt from source material",
  "estimatedTime": "estimated time in minutes",
  "order": 0
}

Available slide types:
- "textAndImage": For concepts that benefit from visual support
- "textAndBullets": For lists, steps, or key points
- "iconsWithTitles": For 3-4 main principles or categories
- "multipleChoice": For knowledge checks and assessments
- "tabs": For comparing different approaches or roles
- "flipCards": For definitions, terms, or before/after scenarios
- "faq": For common questions and answers
- "popups": For additional resources or deep-dive information

Chunking Guidelines:
1. Each chunk should cover one main concept or learning point
2. Aim for 5-12 chunks total depending on content length
3. Include knowledge checks every 3-4 informational chunks
4. Start with overview/introduction chunks
5. End with summary or next steps
6. Each chunk should be completable in 1-3 minutes
7. Vary slide types to maintain engagement
8. Ensure logical flow and progression

Remember: Respond with ONLY the JSON array, nothing else.`;
  }

  /**
   * Build user prompt for chunking
   */
  buildChunkingUserPrompt(courseConfig) {
    return `Please analyze the following course information and create a structured chunking plan:

COURSE TITLE: ${courseConfig.title}

TARGET AUDIENCE: ${courseConfig.targetAudience || "Professional learners"}

ESTIMATED DURATION: ${courseConfig.estimatedDuration || "30-45 minutes"}

LEARNING OBJECTIVES:
${courseConfig.learningObjectives.map((obj) => `- ${obj}`).join("\n")}

SOURCE CONTENT:
${courseConfig.sourceContent}

ADDITIONAL GUIDANCE:
${
  courseConfig.additionalGuidance ||
  "Create an engaging, well-structured course that meets the learning objectives."
}

Create a JSON array of chunks that will effectively teach this content to the target audience.`;
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
   * Parse chunking response from AI
   */
  parseChunkingResponse(content) {
    try {
      // Clean up the response - remove any markdown formatting
      const cleanContent = content.replace(/```json\s*|\s*```/g, "").trim();

      const chunks = JSON.parse(cleanContent);

      if (!Array.isArray(chunks)) {
        throw new Error("Response is not an array");
      }

      // Validate and enhance chunks
      return chunks.map((chunk, index) => ({
        id: `chunk_${Date.now()}_${index}_${Math.floor(Math.random() * 1000)}`, // Generate string ID
        title: chunk.title || `Chunk ${index + 1}`,
        slideType: chunk.slideType || "textAndImage",
        sourceContent: chunk.sourceContent || "",
        estimatedTime: chunk.estimatedTime || "2 minutes",
        order: index,
        isLocked: false,
        generatedContent: null,
      }));
    } catch (error) {
      console.error("Failed to parse chunking response:", error);
      console.error("Raw response:", content);
      throw new Error(`Invalid chunking response format: ${error.message}`);
    }
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
