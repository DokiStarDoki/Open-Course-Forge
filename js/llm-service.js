/**
 * Course Forge MVP - LLM Service (FIXED GROUND TRUTH PRESERVATION)
 * Handles communication with AI models using XML tags for reliable data extraction
 * UPDATED: Now supports both OpenRouter/DeepSeek and ChatGPT API based on config
 * FIXED: Ground truth is preserved and used as foundation for content generation
 */

class LLMService {
  constructor() {
    this.openRouterApiKey = null;
    this.openAIApiKey = null;
    this.apiUrl = null;
    this.isReady = false;
    this.initializationPromise = null;
    this.requestQueue = []; // ADDED: Request queue for rate limiting
    this.isProcessingQueue = false; // ADDED: Queue processing flag
    this.rateLimitConfig = {
      maxRequestsPerMinute: 20,
      requestInterval: 3000, // 3 seconds between requests
      maxConcurrentRequests: 2,
    };
    this.requestHistory = []; // ADDED: Track request timing
    this.concurrentRequests = 0; // ADDED: Track concurrent requests

    // Start initialization but don't block constructor
    this.initializationPromise = this.initializeAPI();
  }

  /**
   * Initialize API configuration with enhanced error handling
   */
  async initializeAPI() {
    try {
      console.log("🚀 Initializing LLM Service...");

      // Check if we're in development and have local config
      if (this.isDevelopment()) {
        console.log(
          "📍 Development environment detected, loading local config..."
        );
        await this.loadLocalConfig();
      }

      // Set API URL based on configuration
      this.apiUrl = this.getAPIUrl();

      // Validate setup
      this.validateSetup();

      // ADDED: Test the connection with a simple request
      await this.testConnection();

      this.isReady = true;

      if (CONFIG.DEBUG.ENABLED) {
        console.log("✅ LLMService initialized successfully");
        console.log("📊 Configuration:", {
          provider: CONFIG.getActiveAPIProvider(),
          apiUrl: this.apiUrl,
          usingProxy: this.isUsingProxy(),
          hasRequiredApiKey: this.hasRequiredAPIKey(),
          rateLimits: this.rateLimitConfig,
        });
      }
    } catch (error) {
      console.error("❌ Failed to initialize LLMService:", error);

      // Show user-friendly error message
      if (this.isDevelopment() && !this.hasRequiredAPIKey()) {
        const provider = CONFIG.getActiveAPIProvider();
        const keyName =
          provider === "OPENAI" ? "OPENAI_API_KEY" : "OPENROUTER_API_KEY";
        StatusManager.showError(
          `Please create js/local.config.js with your ${keyName} to use AI features`
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
   * ADDED: Test connection to AI service
   */
  async testConnection() {
    try {
      console.log("🔗 Testing AI service connection...");

      const testMessages = [
        { role: "system", content: "You are a test assistant." },
        { role: "user", content: "Respond with exactly the word 'OK'" },
      ];

      const response = await this.makeDirectRequest(testMessages, {
        maxTokens: 10,
        temperature: 0,
        skipQueue: true, // Skip rate limiting for test
      });

      if (response.choices && response.choices.length > 0) {
        console.log("✅ AI service connection test successful");
        return true;
      } else {
        throw new Error("Invalid response from AI service");
      }
    } catch (error) {
      console.warn("⚠️ AI service connection test failed:", error.message);
      // Don't throw - service might still work for real requests
      return false;
    }
  }

  /**
   * ENHANCED: Ensure service is ready with better error handling
   */
  async ensureReady() {
    if (!this.initializationPromise) {
      throw new Error("LLM Service not initialized");
    }

    try {
      await this.initializationPromise;
    } catch (error) {
      throw new Error(`LLM Service initialization failed: ${error.message}`);
    }

    if (!this.isReady) {
      throw new Error("LLM Service failed to initialize properly");
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
   * Load local configuration (development only) with timeout
   */
  async loadLocalConfig() {
    if (!this.isDevelopment()) return;

    try {
      // Wait for local config to load with longer timeout
      const configLoaded = await this.waitForLocalConfig(5000);

      if (configLoaded && window.LOCAL_CONFIG) {
        // Load OpenRouter API key
        if (window.LOCAL_CONFIG.OPENROUTER_API_KEY) {
          this.openRouterApiKey = window.LOCAL_CONFIG.OPENROUTER_API_KEY;
          console.log("✅ OpenRouter API key loaded");
        }

        // Load OpenAI API key
        if (window.LOCAL_CONFIG.OPENAI_API_KEY) {
          this.openAIApiKey = window.LOCAL_CONFIG.OPENAI_API_KEY;
          console.log("✅ OpenAI API key loaded");
        }
      } else {
        console.warn(
          "⚠️ Local config not available after timeout, will use proxy"
        );
      }
    } catch (error) {
      console.warn("⚠️ Local config loading failed:", error.message);
    }
  }

  /**
   * Wait for local config to load with enhanced checking
   */
  async waitForLocalConfig(timeoutMs = 5000) {
    const startTime = Date.now();
    const checkInterval = 100;

    while (Date.now() - startTime < timeoutMs) {
      if (
        window.LOCAL_CONFIG &&
        (window.LOCAL_CONFIG.OPENROUTER_API_KEY ||
          window.LOCAL_CONFIG.OPENAI_API_KEY)
      ) {
        return true;
      }
      await this.wait(checkInterval);
    }

    return false;
  }

  /**
   * Wait utility function
   */
  wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get API URL based on environment and configuration
   */
  getAPIUrl() {
    if (this.isDevelopment()) {
      if (this.hasRequiredAPIKey()) {
        return CONFIG.getActiveAPIEndpoint();
      } else {
        return "https://your-vercel-deployment.vercel.app/api/chat";
      }
    } else {
      return "/api/chat";
    }
  }

  /**
   * Check if we have the required API key for the current provider
   */
  hasRequiredAPIKey() {
    if (CONFIG.USE_CHATGPT_API) {
      return !!this.openAIApiKey;
    } else {
      return !!this.openRouterApiKey;
    }
  }

  /**
   * Get the appropriate API key for the current provider
   */
  getCurrentAPIKey() {
    if (CONFIG.USE_CHATGPT_API) {
      return this.openAIApiKey;
    } else {
      return this.openRouterApiKey;
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
      console.log("📡 Using proxy URL:", this.apiUrl);
      return true;
    } else if (!this.hasRequiredAPIKey()) {
      const provider = CONFIG.getActiveAPIProvider();
      const keyName =
        provider === "OPENAI" ? "OPENAI_API_KEY" : "OPENROUTER_API_KEY";

      console.warn(
        `⚠️ No ${provider} API key available. Please set up local.config.js with your ${keyName}.`
      );
      console.warn(
        `📝 Example: window.LOCAL_CONFIG = { ${keyName}: "your-key-here" };`
      );
      throw new Error(
        `No ${provider} API key available and proxy not properly configured`
      );
    }
    return true;
  }

  /**
   * ENHANCED: Make API request with rate limiting and queue management
   */
  async makeRequest(messages, options = {}) {
    await this.ensureReady();

    // Skip queue for test requests
    if (options.skipQueue) {
      return this.makeDirectRequest(messages, options);
    }

    // Add request to queue
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        messages,
        options,
        resolve,
        reject,
        timestamp: Date.now(),
      });

      // Start processing queue if not already processing
      if (!this.isProcessingQueue) {
        this.processRequestQueue();
      }
    });
  }

  /**
   * ADDED: Process request queue with rate limiting
   */
  async processRequestQueue() {
    if (this.isProcessingQueue) return;

    this.isProcessingQueue = true;
    console.log(
      `📊 Processing request queue (${this.requestQueue.length} requests)`
    );

    while (this.requestQueue.length > 0) {
      // Check rate limits
      if (!this.canMakeRequest()) {
        const waitTime = this.getWaitTime();
        console.log(`⏳ Rate limit reached, waiting ${waitTime}ms`);
        await this.wait(waitTime);
        continue;
      }

      // Get next request
      const request = this.requestQueue.shift();

      try {
        console.log(
          `🔄 Processing request (${this.requestQueue.length} remaining)`
        );

        // Track concurrent requests
        this.concurrentRequests++;

        // Make the actual request
        const response = await this.makeDirectRequest(
          request.messages,
          request.options
        );

        // Track request completion
        this.recordRequest();
        this.concurrentRequests--;

        request.resolve(response);

        // Wait between requests to avoid overwhelming the API
        if (this.requestQueue.length > 0) {
          await this.wait(this.rateLimitConfig.requestInterval);
        }
      } catch (error) {
        this.concurrentRequests--;
        request.reject(error);

        // Continue processing other requests even if one fails
        console.error(
          "❌ Request failed, continuing with queue:",
          error.message
        );
      }
    }

    this.isProcessingQueue = false;
    console.log("✅ Request queue processing complete");
  }

  /**
   * ADDED: Check if we can make a request based on rate limits
   */
  canMakeRequest() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Clean old requests
    this.requestHistory = this.requestHistory.filter(
      (time) => time > oneMinuteAgo
    );

    // Check concurrent requests
    if (this.concurrentRequests >= this.rateLimitConfig.maxConcurrentRequests) {
      return false;
    }

    // Check requests per minute
    if (
      this.requestHistory.length >= this.rateLimitConfig.maxRequestsPerMinute
    ) {
      return false;
    }

    return true;
  }

  /**
   * ADDED: Get wait time for rate limiting
   */
  getWaitTime() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Clean old requests
    this.requestHistory = this.requestHistory.filter(
      (time) => time > oneMinuteAgo
    );

    // If we're at the limit, wait until the oldest request is more than a minute old
    if (
      this.requestHistory.length >= this.rateLimitConfig.maxRequestsPerMinute
    ) {
      const oldestRequest = Math.min(...this.requestHistory);
      return Math.max(1000, oldestRequest + 60000 - now);
    }

    // Otherwise wait the standard interval
    return this.rateLimitConfig.requestInterval;
  }

  /**
   * ADDED: Record a completed request
   */
  recordRequest() {
    this.requestHistory.push(Date.now());
  }

  /**
   * Make direct API request to LLM with improved error handling
   */
  async makeDirectRequest(messages, options = {}) {
    const requestBody = {
      model: options.model || CONFIG.getDefaultModel(),
      messages: messages,
      max_tokens: options.maxTokens || 4000,
      temperature: options.temperature || 0.7,
      stream: false,
    };

    // Add provider-specific parameters
    if (CONFIG.USE_CHATGPT_API) {
      // OpenAI API parameters
      requestBody.top_p = options.topP || 0.9;
      if (options.stop) requestBody.stop = options.stop;
    } else {
      // OpenRouter API parameters
      requestBody.top_p = options.topP || 0.9;
      requestBody.stop = options.stop || null;
      requestBody.presence_penalty = 0.1;
      requestBody.frequency_penalty = 0.1;
    }

    const requestOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    };

    // Add authorization header if using direct API
    if (!this.isUsingProxy() && this.hasRequiredAPIKey()) {
      const apiKey = this.getCurrentAPIKey();
      requestOptions.headers["Authorization"] = `Bearer ${apiKey}`;

      // Add provider-specific headers
      if (!CONFIG.USE_CHATGPT_API) {
        // OpenRouter specific headers
        requestOptions.headers["HTTP-Referer"] = window.location.origin;
        requestOptions.headers["X-Title"] = "Course Forge MVP";
      }
    }

    // ADDED: Request timeout
    const timeoutMs = options.timeout || 60000; // 60 second timeout
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);
    requestOptions.signal = abortController.signal;

    try {
      if (CONFIG.DEBUG.ENABLED) {
        console.log("🚀 Making LLM request:", {
          provider: CONFIG.getActiveAPIProvider(),
          url: this.apiUrl,
          model: requestBody.model,
          messageCount: messages.length,
          usingProxy: this.isUsingProxy(),
          temperature: requestBody.temperature,
          timeout: timeoutMs,
        });
      }

      const response = await fetch(this.apiUrl, requestOptions);
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `API request failed: ${response.status} ${response.statusText}`;

        switch (response.status) {
          case 400:
            errorMessage = "Invalid request format. Please try again.";
            break;
          case 401:
            const provider = CONFIG.getActiveAPIProvider();
            errorMessage = `Invalid API key. Please check your ${provider} API key configuration.`;
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
        console.log("✅ LLM response received:", {
          provider: CONFIG.getActiveAPIProvider(),
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
      clearTimeout(timeoutId);
      console.error("❌ LLM request failed:", error);

      if (error.name === "AbortError") {
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
   * Generate content chunks using XML tags for reliable extraction
   */
  async generateChunks(courseConfig) {
    const maxRetries = 3; // Increased retries
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `🎯 Starting chunk generation attempt ${attempt}/${maxRetries}`
        );

        const systemPrompt = this.buildChunkingSystemPrompt();
        const userPrompt = this.buildChunkingUserPrompt(courseConfig);

        const messages = [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ];

        // Adjust temperature based on attempt and use appropriate model
        const temperature = attempt === 1 ? 0.3 : 0.1;
        const model = CONFIG.getModelForTask("chunking");

        const response = await this.makeRequest(messages, {
          model: model,
          temperature: temperature,
          maxTokens: 3000,
        });

        if (!response.choices || response.choices.length === 0) {
          throw new Error("No response choices received from AI");
        }

        const content = response.choices[0].message.content;

        // ALWAYS LOG THE FULL RESPONSE
        console.log(`=== FULL AI RESPONSE (ATTEMPT ${attempt}) ===`);
        console.log("Provider:", CONFIG.getActiveAPIProvider());
        console.log("Model:", model);
        console.log("Response length:", content.length);
        console.log("Response content:", content);
        console.log("=== END FULL RESPONSE ===");

        const chunks = this.parseChunkingResponseXML(content, attempt);
        console.log(
          `✅ Successfully generated ${chunks.length} chunks on attempt ${attempt}`
        );
        return chunks;
      } catch (error) {
        lastError = error;
        console.warn(`❌ Chunking attempt ${attempt} failed:`, error.message);

        if (attempt < maxRetries) {
          const waitTime = 1000 * attempt * attempt; // Exponential backoff
          console.log(
            `⏳ Retrying chunking in ${waitTime}ms (attempt ${
              attempt + 1
            }/${maxRetries})...`
          );
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }
    }

    throw new Error(
      `Chunking failed after ${maxRetries} attempts: ${lastError.message}`
    );
  }

  /**
   * FIXED: Generate content for a specific chunk - preserve existing ground truth
   */
  async generateSlideContent(chunk, courseConfig) {
    const maxRetries = 2;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `🎯 Generating content for chunk ${chunk.id}, attempt ${attempt}/${maxRetries}`
        );

        const systemPrompt = this.buildContentSystemPrompt();
        const userPrompt = this.buildContentUserPrompt(chunk, courseConfig);

        const messages = [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ];

        const model = CONFIG.getModelForTask("content_generation");

        const response = await this.makeRequest(messages, {
          model: model,
          temperature: 0.4,
          maxTokens: 10000,
        });

        if (!response.choices || response.choices.length === 0) {
          throw new Error("No response choices received from AI");
        }

        const content = response.choices[0].message.content;

        // ALWAYS LOG CONTENT GENERATION RESPONSES
        console.log("=== CONTENT GENERATION RESPONSE ===");
        console.log("Provider:", CONFIG.getActiveAPIProvider());
        console.log("Model:", model);
        console.log("Chunk ID:", chunk.id);
        console.log("Slide Type:", chunk.slideType);
        console.log("Ground Truth:", chunk.groundTruth || "No ground truth");
        console.log("Response length:", content.length);
        console.log("Response content:", content);
        console.log("=== END CONTENT RESPONSE ===");

        const parsedContent = this.parseContentResponseXML(
          content,
          chunk.slideType
        );
        console.log(
          `✅ Successfully generated content for chunk ${chunk.id} on attempt ${attempt}`
        );
        return parsedContent;
      } catch (error) {
        lastError = error;
        console.error(
          `❌ Content generation attempt ${attempt} failed for chunk ${chunk.id}:`,
          error
        );

        if (attempt < maxRetries) {
          const waitTime = 2000 * attempt; // Linear backoff for content generation
          console.log(`⏳ Retrying content generation in ${waitTime}ms...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }
    }

    throw new Error(
      `Content generation failed after ${maxRetries} attempts: ${lastError.message}`
    );
  }

  /**
   * ADDED: Get queue status for debugging
   */
  getQueueStatus() {
    return {
      queueLength: this.requestQueue.length,
      isProcessing: this.isProcessingQueue,
      concurrentRequests: this.concurrentRequests,
      requestsInLastMinute: this.requestHistory.filter(
        (time) => Date.now() - time < 60000
      ).length,
      canMakeRequest: this.canMakeRequest(),
      nextAvailableTime: this.canMakeRequest() ? 0 : this.getWaitTime(),
    };
  }

  /**
   * ADDED: Clear the request queue (for emergency stops)
   */
  clearQueue() {
    const clearedCount = this.requestQueue.length;
    this.requestQueue.forEach((request) => {
      request.reject(new Error("Request cancelled: queue cleared"));
    });
    this.requestQueue = [];
    console.log(`🗑️ Cleared ${clearedCount} requests from queue`);
  }

  /**
   * Build system prompt for chunking using XML tags - FIXED: Emphasize ground truth creation
   */
  buildChunkingSystemPrompt() {
    return `You are an expert instructional designer creating structured eLearning courses. Your task is to analyze source content and break it down into logical chunks for individual slides.

IMPORTANT: You must respond using XML tags to structure your data. This format is much more reliable than JSON.

Available slide types:
- title: Title slide with course name and overview
- courseInfo: Course information, duration, audience, objectives
- textAndImage: Main content with supporting image
- textAndBullets: Text content with bullet points
- iconsWithTitles: Grid of icons with titles and descriptions
- faq: Frequently asked questions
- flipCards: Interactive cards that flip to reveal information
- multipleChoice: Quiz questions with multiple choice answers
- tabs: Tabbed content organization
- popups: Information revealed through interactive popups

Guidelines:
1. Create 6-12 logical chunks from the source content
2. Each chunk should cover a distinct topic or concept
3. Choose appropriate slide types based on content structure
4. Ensure good flow and progression through the material
5. Include interactive elements (faq, flipCards, multipleChoice) where appropriate
6. Balance text-heavy and visual slides
7. MOST IMPORTANT: Create detailed ground truth guidance for each chunk that will serve as the foundation for content generation

Respond with your chunks wrapped in XML tags exactly like this:

<chunks>
<chunk>
<title>Introduction to Course Topic</title>
<slideType>title</slideType>
<sourceContent>Relevant portion of source content for this chunk...</sourceContent>
<groundTruth>A detailed paragraph describing exactly what this slide should cover, its specific purpose within the course, what learners should understand after viewing it, and any specific points or examples that must be included. This ground truth will guide content generation and should be comprehensive.</groundTruth>
</chunk>
<chunk>
<title>Key Concepts Overview</title>
<slideType>textAndBullets</slideType>
<sourceContent>Relevant portion of source content for this chunk...</sourceContent>
<groundTruth>This slide will introduce the main concepts learners need to understand, providing a foundation for deeper topics. It should cover [specific concepts], explain [specific relationships], and prepare learners for [what comes next]. Include examples of [specific examples] and emphasize [key points].</groundTruth>
</chunk>
</chunks>

Make sure each chunk has meaningful source content and detailed ground truth guidance that will serve as the foundation for content generation.`;
  }

  /**
   * Build user prompt for chunking
   */
  buildChunkingUserPrompt(courseConfig) {
    return `Please analyze the following course content and break it into logical chunks for eLearning slides:

**Course Title:** ${courseConfig.title}
**Target Audience:** ${courseConfig.targetAudience}
**Learning Objectives:**
${courseConfig.learningObjectives.map((obj) => `- ${obj}`).join("\n")}

**Source Content:**
${courseConfig.sourceContent}

${
  courseConfig.additionalGuidance
    ? `**Additional Guidance:** ${courseConfig.additionalGuidance}`
    : ""
}

Please create 6-12 chunks that cover this material comprehensively. Each chunk should have a clear title, appropriate slide type, relevant source content, and DETAILED ground truth guidance that will serve as the foundation for content generation.`;
  }

  /**
   * FIXED: Build system prompt for content generation - emphasize using existing ground truth
   */
  buildContentSystemPrompt() {
    return `You are an expert instructional designer creating content for eLearning slides. You must use XML tags to structure your response.

CRITICAL: You will be provided with existing ground truth guidance for this slide. Use this ground truth as the foundation for your content generation. DO NOT modify or ignore the ground truth - it defines exactly what this slide should cover.

Use the XML format that matches the slide type:

For "title":
<content>
<header>Course Title</header>
<text>Course overview and introduction text</text>
<audioScript>Script for audio narration</audioScript>
</content>

For "courseInfo":
<content>
<header>Course Information</header>
<text>Course description</text>
<duration>Estimated duration</duration>
<audience>Target audience description</audience>
<objective>Learning objective 1</objective>
<objective>Learning objective 2</objective>
<objective>Learning objective 3</objective>
<audioScript>Script for audio narration</audioScript>
</content>

For "textAndImage":
<content>
<header>Slide title</header>
<text>Main content paragraph</text>
<image>https://images.unsplash.com/photo-relevant-image?w=500&h=300&fit=crop</image>
<audioScript>Script for audio narration</audioScript>
</content>

For "textAndBullets":
<content>
<header>Slide title</header>
<text>Introduction paragraph</text>
<bullet>Bullet point 1</bullet>
<bullet>Bullet point 2</bullet>
<bullet>Bullet point 3</bullet>
<audioScript>Script for audio narration</audioScript>
</content>

For "iconsWithTitles":
<content>
<header>Slide title</header>
<icon>
<iconName>target</iconName>
<title>Title 1</title>
<description>Description 1</description>
</icon>
<icon>
<iconName>users</iconName>
<title>Title 2</title>
<description>Description 2</description>
</icon>
<icon>
<iconName>trending-up</iconName>
<title>Title 3</title>
<description>Description 3</description>
</icon>
<audioScript>Script for audio narration</audioScript>
</content>

For "multipleChoice":
<content>
<question>Question text</question>
<option>Option A</option>
<option>Option B</option>
<option>Option C</option>
<option>Option D</option>
<correctAnswer>0</correctAnswer>
<feedbackCorrect>Explanation for correct answer</feedbackCorrect>
<feedbackIncorrect>Explanation and learning opportunity</feedbackIncorrect>
<audioScript>Script for audio narration</audioScript>
</content>

For "tabs":
<content>
<tab>
<title>Tab 1</title>
<tabContent>Content for tab 1</tabContent>
</tab>
<tab>
<title>Tab 2</title>
<tabContent>Content for tab 2</tabContent>
</tab>
<tab>
<title>Tab 3</title>
<tabContent>Content for tab 3</tabContent>
</tab>
</content>

For "flipCards":
<content>
<card>
<front>Term or concept</front>
<back>Definition or explanation</back>
</card>
<card>
<front>Another term</front>
<back>Another explanation</back>
</card>
</content>

For "faq":
<content>
<header>FAQ Section Title</header>
<faqItem>
<question>Question 1?</question>
<answer>Answer 1</answer>
</faqItem>
<faqItem>
<question>Question 2?</question>
<answer>Answer 2</answer>
</faqItem>
<audioScript>Script for audio narration</audioScript>
</content>

For "popups":
<content>
<popup>
<title>Resource 1</title>
<popupContent>Detailed content for popup 1</popupContent>
</popup>
<popup>
<title>Resource 2</title>
<popupContent>Detailed content for popup 2</popupContent>
</popup>
</content>

Guidelines:
- Use professional, conversational tone
- Include specific, actionable information
- For images, use relevant Unsplash photo URLs
- Audio scripts should be 15-30 seconds when read aloud
- Make multiple choice questions scenario-based
- Ensure content is concise and focused
- MOST IMPORTANT: Base your content generation on the provided ground truth guidance - this defines what the slide should cover

Remember: Use the XML format exactly as shown for the specific slide type and follow the ground truth guidance precisely.`;
  }

  /**
   * FIXED: Build user prompt for content generation - emphasize using existing ground truth
   */
  buildContentUserPrompt(chunk, courseConfig) {
    return `Generate content for a "${chunk.slideType}" slide using XML tags.

SLIDE TITLE: ${chunk.title}

COURSE CONTEXT:
- Course: ${courseConfig.title}
- Target Audience: ${courseConfig.targetAudience || "Professional learners"}
- Learning Objectives: ${courseConfig.learningObjectives.join(", ")}

SOURCE CONTENT FOR THIS SLIDE:
${chunk.sourceContent}

GROUND TRUTH GUIDANCE (FOLLOW THIS PRECISELY):
${
  chunk.groundTruth ||
  "No specific guidance provided - use source content to determine slide coverage."
}

ADDITIONAL GUIDANCE:
${
  courseConfig.additionalGuidance ||
  "Create engaging, practical content that helps learners achieve the objectives."
}

CRITICAL INSTRUCTIONS:
1. Use the ground truth guidance as the foundation for your content generation
2. Ensure the generated content covers exactly what the ground truth specifies
3. Do not deviate from the ground truth requirements
4. The ground truth defines what this slide should accomplish

Please respond using the XML format specified for "${
      chunk.slideType
    }" slides. Make sure your generated content aligns precisely with the ground truth guidance provided above.`;
  }

  /**
   * Parse chunking response using XML regex extraction - FIXED: Include ground truth
   */
  parseChunkingResponseXML(content, attempt = 1) {
    try {
      console.log(`=== PARSING XML CHUNKS (Attempt ${attempt}) ===`);
      console.log("Raw content:", content);

      // Extract all chunk blocks using regex
      const chunkMatches = content.match(/<chunk>([\s\S]*?)<\/chunk>/g);

      if (!chunkMatches || chunkMatches.length === 0) {
        console.warn("No <chunk> tags found, attempting fallback extraction");
        return this.generateFallbackChunks(content);
      }

      console.log(`Found ${chunkMatches.length} chunk blocks`);

      const chunks = chunkMatches.map((chunkBlock, index) => {
        console.log(`Processing chunk ${index}:`, chunkBlock);

        // Extract individual fields using regex
        const chunk = {
          title:
            this.extractXMLValue(chunkBlock, "title") || `Chunk ${index + 1}`,
          slideType:
            this.extractXMLValue(chunkBlock, "slideType") || "textAndImage",
          sourceContent:
            this.extractXMLValue(chunkBlock, "sourceContent") || "",
          groundTruth: this.extractXMLValue(chunkBlock, "groundTruth") || "", // FIXED: Extract ground truth during chunking
          estimatedTime:
            this.extractXMLValue(chunkBlock, "estimatedTime") || "2 minutes",
          order: parseInt(this.extractXMLValue(chunkBlock, "order")) || index,
        };

        // Validate slide type
        if (
          !CONFIG.SLIDE_TYPES.some((type) => type.value === chunk.slideType)
        ) {
          console.warn(
            `Invalid slide type "${chunk.slideType}", using textAndImage`
          );
          chunk.slideType = "textAndImage";
        }

        // Create final chunk object
        const finalChunk = {
          id: `chunk-${Date.now()}-${index}-${Math.floor(
            Math.random() * 1000
          )}`,
          title: chunk.title,
          slideType: chunk.slideType,
          sourceContent: chunk.sourceContent,
          groundTruth: chunk.groundTruth || "", // FIXED: Preserve ground truth from chunking
          estimatedTime: chunk.estimatedTime,
          order: chunk.order,
          isLocked: false,
          generatedContent: null,
          createdAt: new Date().toISOString(),
        };

        console.log(`Processed chunk ${index}:`, finalChunk);
        return finalChunk;
      });

      console.log(`=== SUCCESSFULLY PARSED ${chunks.length} CHUNKS ===`);
      return chunks;
    } catch (error) {
      console.error("XML chunk parsing failed:", error);
      console.error("Original content:", content);
      return this.generateFallbackChunks(content);
    }
  }

  /**
   * Parse content response using XML regex extraction
   */
  parseContentResponseXML(content, slideType) {
    try {
      console.log("=== PARSING XML CONTENT ===");
      console.log("Slide type:", slideType);
      console.log("Raw content:", content);

      // Extract content block
      const contentMatch = content.match(/<content>([\s\S]*?)<\/content>/);
      if (!contentMatch) {
        throw new Error("No <content> tag found in response");
      }

      const contentBlock = contentMatch[1];
      console.log("Content block:", contentBlock);

      // Parse based on slide type
      switch (slideType) {
        case "title":
          return this.parseTitleXML(contentBlock);
        case "courseInfo":
          return this.parseCourseInfoXML(contentBlock);
        case "textAndImage":
          return this.parseTextAndImageXML(contentBlock);
        case "textAndBullets":
          return this.parseTextAndBulletsXML(contentBlock);
        case "iconsWithTitles":
          return this.parseIconsWithTitlesXML(contentBlock);
        case "multipleChoice":
          return this.parseMultipleChoiceXML(contentBlock);
        case "tabs":
          return this.parseTabsXML(contentBlock);
        case "flipCards":
          return this.parseFlipCardsXML(contentBlock);
        case "faq":
          return this.parseFaqXML(contentBlock);
        case "popups":
          return this.parsePopupsXML(contentBlock);
        default:
          throw new Error(`Unsupported slide type: ${slideType}`);
      }
    } catch (error) {
      console.error("XML content parsing failed:", error);
      console.error("Content:", content);
      throw new Error(`Failed to parse content: ${error.message}`);
    }
  }

  /**
   * Extract value from XML using regex
   */
  extractXMLValue(content, tagName) {
    const regex = new RegExp(`<${tagName}>(.*?)<\/${tagName}>`, "s");
    const match = content.match(regex);
    return match ? match[1].trim() : null;
  }

  /**
   * Extract multiple XML values (for arrays)
   */
  extractXMLValues(content, tagName) {
    const regex = new RegExp(`<${tagName}>(.*?)<\/${tagName}>`, "gs");
    const matches = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      matches.push(match[1].trim());
    }
    return matches;
  }

  /**
   * Parse title slide content
   */
  parseTitleXML(content) {
    return {
      header: this.extractXMLValue(content, "header") || "",
      text: this.extractXMLValue(content, "text") || "",
      audioScript: this.extractXMLValue(content, "audioScript") || "",
    };
  }

  /**
   * Parse course info slide content
   */
  parseCourseInfoXML(content) {
    return {
      header: this.extractXMLValue(content, "header") || "",
      text: this.extractXMLValue(content, "text") || "",
      duration: this.extractXMLValue(content, "duration") || "",
      audience: this.extractXMLValue(content, "audience") || "",
      objectives: this.extractXMLValues(content, "objective"),
      audioScript: this.extractXMLValue(content, "audioScript") || "",
    };
  }

  /**
   * Parse text and image content
   */
  parseTextAndImageXML(content) {
    return {
      header: this.extractXMLValue(content, "header") || "",
      text: this.extractXMLValue(content, "text") || "",
      image:
        this.extractXMLValue(content, "image") ||
        "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&h=300&fit=crop",
      audioScript: this.extractXMLValue(content, "audioScript") || "",
    };
  }

  /**
   * Parse text and bullets content
   */
  parseTextAndBulletsXML(content) {
    return {
      header: this.extractXMLValue(content, "header") || "",
      text: this.extractXMLValue(content, "text") || "",
      bullets: this.extractXMLValues(content, "bullet"),
      audioScript: this.extractXMLValue(content, "audioScript") || "",
    };
  }

  /**
   * Parse icons with titles content
   */
  parseIconsWithTitlesXML(content) {
    const iconBlocks = content.match(/<icon>([\s\S]*?)<\/icon>/g) || [];
    const icons = iconBlocks.map((block) => ({
      icon: this.extractXMLValue(block, "iconName") || "circle",
      title: this.extractXMLValue(block, "title") || "",
      description: this.extractXMLValue(block, "description") || "",
    }));

    return {
      header: this.extractXMLValue(content, "header") || "",
      icons: icons,
      audioScript: this.extractXMLValue(content, "audioScript") || "",
    };
  }

  /**
   * Parse multiple choice content
   */
  parseMultipleChoiceXML(content) {
    return {
      question: this.extractXMLValue(content, "question") || "",
      options: this.extractXMLValues(content, "option"),
      correctAnswer:
        parseInt(this.extractXMLValue(content, "correctAnswer")) || 0,
      feedback: {
        correct: this.extractXMLValue(content, "feedbackCorrect") || "Correct!",
        incorrect:
          this.extractXMLValue(content, "feedbackIncorrect") ||
          "Not quite right.",
      },
      audioScript: this.extractXMLValue(content, "audioScript") || "",
    };
  }

  /**
   * Parse tabs content
   */
  parseTabsXML(content) {
    const tabBlocks = content.match(/<tab>([\s\S]*?)<\/tab>/g) || [];
    return tabBlocks.map((block) => ({
      title: this.extractXMLValue(block, "title") || "",
      content: this.extractXMLValue(block, "tabContent") || "",
    }));
  }

  /**
   * Parse flip cards content
   */
  parseFlipCardsXML(content) {
    const cardBlocks = content.match(/<card>([\s\S]*?)<\/card>/g) || [];
    return cardBlocks.map((block) => ({
      front: this.extractXMLValue(block, "front") || "",
      back: this.extractXMLValue(block, "back") || "",
    }));
  }

  /**
   * Parse FAQ content
   */
  parseFaqXML(content) {
    const faqBlocks = content.match(/<faqItem>([\s\S]*?)<\/faqItem>/g) || [];
    const items = faqBlocks.map((block) => ({
      question: this.extractXMLValue(block, "question") || "",
      answer: this.extractXMLValue(block, "answer") || "",
    }));

    return {
      header: this.extractXMLValue(content, "header") || "",
      items: items,
      audioScript: this.extractXMLValue(content, "audioScript") || "",
    };
  }

  /**
   * Parse popups content
   */
  parsePopupsXML(content) {
    const popupBlocks = content.match(/<popup>([\s\S]*?)<\/popup>/g) || [];
    return popupBlocks.map((block) => ({
      title: this.extractXMLValue(block, "title") || "",
      content: this.extractXMLValue(block, "popupContent") || "",
    }));
  }

  /**
   * Generate fallback chunks when parsing fails - FIXED: Include ground truth
   */
  generateFallbackChunks(originalContent) {
    console.warn("🔄 Generating fallback chunks due to parsing failure");

    // Try to extract titles using more flexible regex
    const titleMatches = originalContent.match(
      /(?:title[">:\s]*)(.*?)(?:[<\n]|$)/gi
    );
    const titles = titleMatches
      ? titleMatches
          .map((match) =>
            match
              .replace(/title[">:\s]*/i, "")
              .replace(/[<\n].*$/, "")
              .trim()
          )
          .filter((title) => title.length > 0 && title.length < 100)
      : [];

    if (titles.length > 0) {
      console.log("Creating fallback chunks from extracted titles:", titles);
      return titles.slice(0, 8).map((title, index) => ({
        id: `fallback-chunk-${Date.now()}-${index}`,
        title: title,
        slideType: index % 4 === 3 ? "multipleChoice" : "textAndImage",
        sourceContent:
          "Generated from parsing failure - manual editing required",
        groundTruth: "Manual editing required - automatic parsing failed", // FIXED: Include ground truth in fallback
        estimatedTime: "2 minutes",
        order: index,
        isLocked: false,
        generatedContent: null,
        createdAt: new Date().toISOString(),
      }));
    }

    // Last resort: create generic chunks
    console.warn("Creating generic fallback chunks");
    return [
      {
        id: `generic-chunk-${Date.now()}-1`,
        title: "Course Introduction",
        slideType: "title",
        sourceContent: "Manual editing required - automatic parsing failed",
        groundTruth: "Manual editing required - automatic parsing failed", // FIXED: Include ground truth
        estimatedTime: "2 minutes",
        order: 0,
        isLocked: false,
        generatedContent: null,
        createdAt: new Date().toISOString(),
      },
      {
        id: `generic-chunk-${Date.now()}-2`,
        title: "Key Concepts",
        slideType: "textAndBullets",
        sourceContent: "Manual editing required - automatic parsing failed",
        groundTruth: "Manual editing required - automatic parsing failed", // FIXED: Include ground truth
        estimatedTime: "3 minutes",
        order: 1,
        isLocked: false,
        generatedContent: null,
        createdAt: new Date().toISOString(),
      },
    ];
  }
}
