/**
 * Course Forge MVP - LLM Service (XML-BASED EXTRACTION)
 * Handles communication with AI models using XML tags for reliable data extraction
 * IMPROVED: Uses XML tags + regex instead of fragile JSON parsing
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
        console.log("LLMService initialized successfully (XML Mode)");
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
      // Wait for local config to load
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
        return "https://openrouter.ai/api/v1/chat/completions";
      } else {
        return "https://your-vercel-deployment.vercel.app/api/chat";
      }
    } else {
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
      stop: options.stop || null,
      presence_penalty: 0.1,
      frequency_penalty: 0.1,
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

      if (error.message.includes("timeout")) {
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

        // Adjust temperature based on attempt
        const temperature = attempt === 1 ? 0.3 : 0.1;

        const response = await this.makeRequest(messages, {
          temperature: temperature,
          maxTokens: 3000,
        });

        if (!response.choices || response.choices.length === 0) {
          throw new Error("No response choices received from AI");
        }

        const content = response.choices[0].message.content;

        // ALWAYS LOG THE FULL RESPONSE
        console.log(`=== FULL AI RESPONSE (ATTEMPT ${attempt}) ===`);
        console.log("Response length:", content.length);
        console.log("Response content:", content);
        console.log("=== END FULL RESPONSE ===");

        return this.parseChunkingResponseXML(content, attempt);
      } catch (error) {
        lastError = error;
        console.warn(`Chunking attempt ${attempt} failed:`, error.message);

        if (attempt < maxRetries) {
          console.log(
            `Retrying chunking (attempt ${attempt + 1}/${maxRetries})...`
          );
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    throw new Error(
      `Chunking failed after ${maxRetries} attempts: ${lastError.message}`
    );
  }

  /**
   * Generate content for a specific chunk using XML tags
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

      // ALWAYS LOG CONTENT GENERATION RESPONSES
      console.log("=== CONTENT GENERATION RESPONSE ===");
      console.log("Chunk ID:", chunk.id);
      console.log("Slide Type:", chunk.slideType);
      console.log("Response length:", content.length);
      console.log("Response content:", content);
      console.log("=== END CONTENT RESPONSE ===");

      return this.parseContentResponseXML(content, chunk.slideType);
    } catch (error) {
      console.error("Content generation failed:", error);
      throw new Error(`Content generation failed: ${error.message}`);
    }
  }

  /**
   * Build system prompt for chunking using XML tags
   */
  buildChunkingSystemPrompt() {
    return `You are an expert instructional designer creating structured eLearning courses. Your task is to analyze source content and break it down into logical chunks for individual slides.

IMPORTANT: You must respond using XML tags to structure your data. This format is much more reliable than JSON.

For each chunk, use this EXACT format:

<chunk>
<title>Clear descriptive title</title>
<slideType>textAndImage</slideType>
<sourceContent>Relevant excerpt from source material</sourceContent>
<estimatedTime>2 minutes</estimatedTime>
<order>0</order>
</chunk>

Available slide types (use exactly these values):
- textAndImage: For concepts that benefit from visual support
- textAndBullets: For lists, steps, or key points  
- iconsWithTitles: For 3-4 main principles or categories
- multipleChoice: For knowledge checks and assessments
- tabs: For comparing different approaches or roles
- flipCards: For definitions, terms, or before/after scenarios
- faq: For common questions and answers
- popups: For additional resources or deep-dive information

Chunking Guidelines:
1. Create 5-8 chunks for optimal learning
2. Each chunk should cover one main concept
3. Include 1-2 knowledge checks (multipleChoice) every 3-4 content chunks
4. Start with overview/introduction, end with summary
5. Vary slide types for engagement
6. Keep estimatedTime as "1 minutes", "2 minutes", or "3 minutes"
7. Set order as sequential numbers: 0, 1, 2, 3, etc.

Example response format:

<chunk>
<title>Introduction to Game Development</title>
<slideType>textAndImage</slideType>
<sourceContent>Game development combines creativity with technical skills to create interactive experiences...</sourceContent>
<estimatedTime>2 minutes</estimatedTime>
<order>0</order>
</chunk>

<chunk>
<title>Key Game Design Principles</title>
<slideType>textAndBullets</slideType>
<sourceContent>Essential principles include player engagement, iterative design, user feedback...</sourceContent>
<estimatedTime>3 minutes</estimatedTime>
<order>1</order>
</chunk>

Remember: Use the XML format exactly as shown. Each chunk must be wrapped in <chunk></chunk> tags with all required fields.`;
  }

  /**
   * Build user prompt for chunking
   */
  buildChunkingUserPrompt(courseConfig) {
    return `Please analyze the following course information and create chunks using the XML format:

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

Please respond with 5-8 chunks using the XML format specified in the system prompt.`;
  }

  /**
   * Build system prompt for content generation using XML tags
   */
  buildContentSystemPrompt() {
    return `You are an expert instructional designer creating content for eLearning slides. You must use XML tags to structure your response.

Use the XML format that matches the slide type:

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

Remember: Use the XML format exactly as shown for the specific slide type.`;
  }

  /**
   * Build user prompt for content generation
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

ADDITIONAL GUIDANCE:
${
  courseConfig.additionalGuidance ||
  "Create engaging, practical content that helps learners achieve the objectives."
}

Please respond using the XML format specified for "${chunk.slideType}" slides.`;
  }

  /**
   * Parse chunking response using XML regex extraction
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
   * Generate fallback chunks when parsing fails
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
        slideType: index % 4 === 3 ? "multipleChoice" : "textAndImage", // Add some variety
        sourceContent: "Content extracted from malformed AI response",
        estimatedTime: "2 minutes",
        order: index,
        isLocked: false,
        generatedContent: null,
        createdAt: new Date().toISOString(),
      }));
    }

    // Last resort: create generic chunks
    console.warn("No titles found, creating generic fallback chunks");
    return [
      {
        id: `fallback-chunk-${Date.now()}-0`,
        title: "Course Introduction",
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
        title: "Knowledge Check",
        slideType: "multipleChoice",
        sourceContent: "AI response parsing failed - please edit this chunk",
        estimatedTime: "2 minutes",
        order: 2,
        isLocked: false,
        generatedContent: null,
        createdAt: new Date().toISOString(),
      },
      {
        id: `fallback-chunk-${Date.now()}-3`,
        title: "Course Summary",
        slideType: "textAndImage",
        sourceContent: "AI response parsing failed - please edit this chunk",
        estimatedTime: "2 minutes",
        order: 3,
        isLocked: false,
        generatedContent: null,
        createdAt: new Date().toISOString(),
      },
    ];
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
      extractionMethod: "XML with regex",
    };
  }
}

// Export for use in other modules
window.LLMService = LLMService;
