/**
 * Course Forge MVP - File Processing (FIXED DOCX Validation)
 * Handles file upload, parsing, and content extraction
 */

class FileProcessor {
  /**
   * Enhanced file processing with better error handling and performance
   */
  static async processFile(file) {
    const startTime = Date.now();

    try {
      // Validate file before processing
      this.validateFile(file);

      const extension = this.getFileExtension(file.name);

      if (CONFIG.DEBUG.ENABLED) {
        console.log(
          `Processing file: ${file.name} (${extension}) - ${this.formatFileSize(
            file.size
          )}`
        );
      }

      let result;

      switch (extension) {
        case "txt":
          result = await this.processTxtFile(file);
          break;
        case "docx":
          result = await this.processDocxFile(file);
          break;
        case "json":
          result = await this.processJsonFile(file);
          break;
        default:
          throw new Error(`Unsupported file type: ${extension}`);
      }

      const processingTime = Date.now() - startTime;
      result.metadata = result.metadata || {};
      result.metadata.processingTime = processingTime;

      if (processingTime > 5000) {
        // Log slow processing
        console.warn(
          `Slow file processing: ${file.name} took ${processingTime}ms`
        );
      }

      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(
        `Error processing file ${file.name} (${processingTime}ms):`,
        error
      );
      throw new Error(`Failed to process ${file.name}: ${error.message}`);
    }
  }

  /**
   * Process multiple files
   */
  static async processFiles(files) {
    const results = [];
    const errors = [];

    for (const file of files) {
      try {
        const result = await this.processFile(file);
        results.push(result);
      } catch (error) {
        errors.push({
          filename: file.name,
          error: error.message,
        });
      }
    }

    return { results, errors };
  }

  /**
   * Validate file before processing
   */
  static validateFile(file) {
    if (!file) {
      throw new Error("No file provided");
    }

    if (file.size > CONFIG.MAX_FILE_SIZE) {
      throw new Error(
        `${CONFIG.ERROR_MESSAGES.FILE_TOO_LARGE} (${this.formatFileSize(
          file.size
        )})`
      );
    }

    const extension = this.getFileExtension(file.name);
    if (!CONFIG.SUPPORTED_EXTENSIONS.includes(extension)) {
      throw new Error(
        `${CONFIG.ERROR_MESSAGES.UNSUPPORTED_FILE_TYPE}: ${extension}`
      );
    }

    if (file.size === 0) {
      throw new Error("File is empty");
    }

    // Additional validation for specific file types
    if (extension === "docx" && file.size < 1000) {
      console.warn("DOCX file seems unusually small, may be corrupted");
    }
  }

  /**
   * Get file extension from filename
   */
  static getFileExtension(filename) {
    return filename.split(".").pop().toLowerCase();
  }

  /**
   * Process text file with streaming for large files
   */
  static async processTxtFile(file) {
    return new Promise((resolve, reject) => {
      // Add timeout for large files
      const timeout = setTimeout(() => {
        reject(new Error("Text file processing timeout"));
      }, 15000);

      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          clearTimeout(timeout);

          const content = e.target.result;

          if (!content || content.trim().length === 0) {
            throw new Error("Text file is empty");
          }

          const wordCount = this.getWordCount(content);

          resolve({
            type: "content",
            content: content,
            filename: file.name,
            size: file.size,
            wordCount: wordCount,
            processedAt: new Date().toISOString(),
            metadata: {
              encoding: "utf-8",
              lineCount: content.split("\n").length,
            },
          });
        } catch (error) {
          clearTimeout(timeout);
          reject(error);
        }
      };

      reader.onerror = () => {
        clearTimeout(timeout);
        reject(new Error("Failed to read text file"));
      };

      reader.readAsText(file, "utf-8");
    });
  }

  /**
   * Process a DOCX file with IMPROVED validation and error handling
   */
  static async processDocxFile(file) {
    return new Promise((resolve, reject) => {
      // Add timeout to prevent hanging
      const timeout = setTimeout(() => {
        reject(new Error("DOCX processing timeout (30 seconds)"));
      }, 30000);

      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          clearTimeout(timeout);

          if (!window.mammoth) {
            throw new Error("Mammoth library not loaded");
          }

          const arrayBuffer = e.target.result;
          const startTime = Date.now();

          // IMPROVED: More lenient DOCX validation
          const uint8Array = new Uint8Array(arrayBuffer);
          const isValidDocx = this.validateDocxFile(uint8Array);

          if (!isValidDocx) {
            console.warn(
              "DOCX validation warning - attempting processing anyway"
            );
            // Don't throw error immediately, try to process anyway
          }

          console.log(
            `Processing DOCX file: ${file.name} (${this.formatFileSize(
              file.size
            )})`
          );

          // Use mammoth with optimized options for better performance
          const result = await mammoth.extractRawText({
            arrayBuffer,
            // Optimize mammoth options for speed
            ignoreEmptyParagraphs: true,
            convertImage: () => null, // Skip image processing for speed
          });

          if (!result.value || result.value.trim().length === 0) {
            throw new Error("DOCX file contains no readable text");
          }

          const content = result.value;
          const wordCount = this.getWordCount(content);

          // Log processing time for debugging
          const processingTime = Date.now() - startTime;
          console.log(
            `DOCX processed successfully: ${wordCount} words extracted in ${processingTime}ms`
          );

          // Log any conversion messages/warnings
          if (result.messages && result.messages.length > 0) {
            console.warn("DOCX conversion warnings:", result.messages);
          }

          resolve({
            type: "content",
            content: content,
            filename: file.name,
            size: file.size,
            wordCount: wordCount,
            processedAt: new Date().toISOString(),
            metadata: {
              conversionMessages: result.messages || [],
              hasWarnings: result.messages && result.messages.length > 0,
              processingTime: processingTime,
              validationPassed: isValidDocx,
            },
          });
        } catch (error) {
          clearTimeout(timeout);
          console.error("DOCX processing error:", error);

          // IMPROVED: Always try fallback processing
          try {
            console.log("Attempting fallback DOCX processing...");
            const fallbackResult = await this.fallbackDocxProcessing(
              arrayBuffer,
              file
            );
            resolve(fallbackResult);
          } catch (fallbackError) {
            console.error("Fallback processing also failed:", fallbackError);
            reject(new Error(`DOCX processing failed: ${error.message}`));
          }
        }
      };

      reader.onerror = () => {
        clearTimeout(timeout);
        reject(new Error("Failed to read DOCX file"));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * IMPROVED: More robust DOCX file validation
   */
  static validateDocxFile(uint8Array) {
    try {
      if (uint8Array.length < 4) {
        return false;
      }

      // Check for various ZIP file signatures that DOCX files can have
      const validZipSignatures = [
        [0x50, 0x4b, 0x03, 0x04], // Standard ZIP signature
        [0x50, 0x4b, 0x05, 0x06], // Empty ZIP signature
        [0x50, 0x4b, 0x07, 0x08], // Spanning ZIP signature
      ];

      let hasValidZipSignature = false;
      for (const signature of validZipSignatures) {
        let matches = true;
        for (let i = 0; i < signature.length && i < uint8Array.length; i++) {
          if (uint8Array[i] !== signature[i]) {
            matches = false;
            break;
          }
        }
        if (matches) {
          hasValidZipSignature = true;
          break;
        }
      }

      if (!hasValidZipSignature) {
        console.warn("No valid ZIP signature found, but continuing anyway");
        // Return true anyway - let mammoth decide if it can process it
        return true;
      }

      // Additional check: look for typical DOCX internal structure
      const content = new TextDecoder("utf-8", { fatal: false }).decode(
        uint8Array.slice(0, 2000)
      );

      // Look for DOCX-specific indicators
      const docxIndicators = [
        "word/",
        "docProps/",
        "_rels/",
        "[Content_Types].xml",
        "application/vnd.openxmlformats",
      ];

      const hasDocxIndicators = docxIndicators.some((indicator) =>
        content.includes(indicator)
      );

      if (hasDocxIndicators) {
        console.log("DOCX structure indicators found - valid DOCX file");
        return true;
      }

      // If no clear indicators, still return true and let mammoth try
      console.warn("No clear DOCX indicators found, but attempting processing");
      return true;
    } catch (error) {
      console.warn(
        "DOCX validation failed, but attempting processing anyway:",
        error
      );
      return true; // Always return true to attempt processing
    }
  }

  /**
   * IMPROVED: Enhanced fallback DOCX processing
   */
  static async fallbackDocxProcessing(arrayBuffer, file) {
    console.warn("Attempting enhanced fallback DOCX processing...");

    try {
      const uint8Array = new Uint8Array(arrayBuffer);

      // Try different encoding approaches
      const encodings = ["utf-8", "utf-16", "iso-8859-1"];
      let extractedText = "";

      for (const encoding of encodings) {
        try {
          const text = new TextDecoder(encoding, { fatal: false }).decode(
            uint8Array
          );
          const extracted = this.extractTextFromDocxString(text);

          if (extracted && extracted.trim().length > extractedText.length) {
            extractedText = extracted;
            console.log(`Better text extracted using ${encoding} encoding`);
          }
        } catch (encodingError) {
          console.warn(`Failed with ${encoding} encoding:`, encodingError);
        }
      }

      // If we still don't have good text, try binary pattern matching
      if (!extractedText || extractedText.trim().length < 50) {
        console.log("Attempting binary pattern extraction...");
        extractedText = this.extractTextFromBinaryDocx(uint8Array);
      }

      if (extractedText && extractedText.trim().length > 0) {
        return {
          type: "content",
          content: extractedText,
          filename: file.name,
          size: file.size,
          wordCount: this.getWordCount(extractedText),
          processedAt: new Date().toISOString(),
          metadata: {
            processingMethod: "enhanced-fallback",
            hasWarnings: true,
            conversionMessages: [
              "Used enhanced fallback processing - some formatting may be lost",
              "File may not be a standard DOCX format or may be corrupted",
            ],
          },
        };
      }

      throw new Error("No readable text could be extracted from the file");
    } catch (error) {
      throw new Error(
        `Enhanced fallback DOCX processing failed: ${error.message}`
      );
    }
  }

  /**
   * IMPROVED: Extract text from DOCX using multiple pattern approaches
   */
  static extractTextFromDocxString(content) {
    try {
      // Multiple extraction strategies
      const strategies = [
        // Strategy 1: XML text content patterns
        () => {
          const xmlPatterns = [
            /<w:t[^>]*>([^<]+)<\/w:t>/g,
            /<t[^>]*>([^<]+)<\/t>/g,
            /<text[^>]*>([^<]+)<\/text>/g,
          ];

          let texts = [];
          for (const pattern of xmlPatterns) {
            let match;
            while ((match = pattern.exec(content)) !== null) {
              const text = match[1].trim();
              if (
                text.length > 1 &&
                !text.includes("xmlns") &&
                !text.includes("http")
              ) {
                texts.push(text);
              }
            }
          }
          return texts;
        },

        // Strategy 2: Word-like content patterns
        () => {
          const wordPattern =
            /(?:^|>|\s)([A-Za-z][A-Za-z0-9\s\.,;:!?\-'"]{10,}[A-Za-z0-9\.,;:!?])(?:<|\s|$)/g;
          let texts = [];
          let match;
          while ((match = wordPattern.exec(content)) !== null) {
            const text = match[1].trim();
            if (
              text.length > 10 &&
              !text.includes("<") &&
              !text.includes("http")
            ) {
              texts.push(text);
            }
          }
          return texts;
        },

        // Strategy 3: Sentence-like patterns
        () => {
          const sentencePattern = /([A-Z][^.!?]*[.!?])/g;
          let texts = [];
          let match;
          while ((match = sentencePattern.exec(content)) !== null) {
            const text = match[1].trim();
            if (
              text.length > 15 &&
              !text.includes("<") &&
              !text.includes("xmlns")
            ) {
              texts.push(text);
            }
          }
          return texts;
        },
      ];

      // Try each strategy and combine results
      let allTexts = [];
      for (const strategy of strategies) {
        try {
          const texts = strategy();
          allTexts.push(...texts);
        } catch (strategyError) {
          console.warn("Strategy failed:", strategyError);
        }
      }

      // Clean up and deduplicate
      const uniqueTexts = [...new Set(allTexts)]
        .filter((text) => text.length > 5)
        .sort((a, b) => b.length - a.length) // Prefer longer texts
        .slice(0, 100); // Limit to prevent memory issues

      const result = uniqueTexts.join(" ").replace(/\s+/g, " ").trim();

      return result;
    } catch (error) {
      console.error("Text extraction failed:", error);
      return "";
    }
  }

  /**
   * NEW: Extract text from binary DOCX data using byte patterns
   */
  static extractTextFromBinaryDocx(uint8Array) {
    try {
      console.log("Attempting binary pattern extraction...");

      // Look for readable ASCII text in the binary data
      let text = "";
      let currentWord = "";

      for (let i = 0; i < uint8Array.length; i++) {
        const byte = uint8Array[i];

        // Check if byte represents a printable ASCII character
        if (byte >= 32 && byte <= 126) {
          currentWord += String.fromCharCode(byte);
        } else {
          // Non-printable character - end current word if it's long enough
          if (currentWord.length >= 3) {
            // Check if it looks like a real word (not XML tags or metadata)
            if (
              !currentWord.includes("<") &&
              !currentWord.includes("xml") &&
              !currentWord.includes("rel") &&
              !currentWord.match(/^[A-Z]{2,}$/) && // Skip all-caps abbreviations
              currentWord.match(/[a-z]/)
            ) {
              // Must contain lowercase letters
              text += currentWord + " ";
            }
          }
          currentWord = "";
        }
      }

      // Add final word if valid
      if (currentWord.length >= 3) {
        text += currentWord;
      }

      // Clean up the extracted text
      const cleanedText = text
        .replace(/\s+/g, " ")
        .replace(/[^\w\s\.,;:!?\-'"]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      console.log(`Binary extraction found ${cleanedText.length} characters`);
      return cleanedText;
    } catch (error) {
      console.error("Binary extraction failed:", error);
      return "";
    }
  }

  /**
   * Process a JSON file
   */
  static async processJsonFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const jsonText = e.target.result;

          if (!jsonText || jsonText.trim().length === 0) {
            throw new Error("JSON file is empty");
          }

          let data;
          try {
            data = JSON.parse(jsonText);
          } catch (parseError) {
            throw new Error(`Invalid JSON format: ${parseError.message}`);
          }

          // Determine if this is course data or content data
          const fileType = this.determineJsonType(data);

          const result = {
            filename: file.name,
            size: file.size,
            processedAt: new Date().toISOString(),
            metadata: {
              keys: Object.keys(data),
              dataType: fileType,
            },
          };

          if (fileType === "course") {
            result.type = "course";
            result.data = data;
          } else {
            result.type = "content";
            result.content = JSON.stringify(data, null, 2);
            result.wordCount = this.getWordCount(result.content);
          }

          resolve(result);
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error("Failed to read JSON file"));
      };

      reader.readAsText(file, "utf-8");
    });
  }

  /**
   * Determine if JSON data is course data or content data
   */
  static determineJsonType(data) {
    if (!data || typeof data !== "object") {
      return "content";
    }

    // Check for course-specific properties
    const courseIndicators = [
      "slides",
      "chunks",
      "courseConfig",
      "generatedSlides",
      "version",
      "exportedAt",
    ];

    const hascourseIndicators = courseIndicators.some((key) =>
      data.hasOwnProperty(key)
    );

    // Additional check for course structure
    if (data.courseConfig && typeof data.courseConfig === "object") {
      return "course";
    }

    if (data.slides && Array.isArray(data.slides)) {
      return "course";
    }

    if (data.chunks && Array.isArray(data.chunks)) {
      return "course";
    }

    return hascourseIndicators ? "course" : "content";
  }

  /**
   * Get word count for text content
   */
  static getWordCount(text) {
    if (!text || typeof text !== "string") {
      return 0;
    }

    // Remove extra whitespace and split by whitespace
    const words = text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0);
    return words.length;
  }

  /**
   * Get character count for text content
   */
  static getCharacterCount(text) {
    if (!text || typeof text !== "string") {
      return { total: 0, withoutSpaces: 0 };
    }

    return {
      total: text.length,
      withoutSpaces: text.replace(/\s/g, "").length,
    };
  }

  /**
   * Validate content for course creation
   */
  static validateContent(content) {
    const wordCount = this.getWordCount(content);
    const charCount = this.getCharacterCount(content);

    const result = {
      isValid: true,
      warnings: [],
      errors: [],
      stats: {
        wordCount,
        characterCount: charCount.total,
        characterCountWithoutSpaces: charCount.withoutSpaces,
      },
    };

    // Check minimum content
    if (wordCount < CONFIG.CONTENT.MIN_WORD_COUNT) {
      result.errors.push(
        `Content too short. Minimum ${CONFIG.CONTENT.MIN_WORD_COUNT} words required, got ${wordCount}`
      );
      result.isValid = false;
    }

    // Check maximum content
    if (wordCount > CONFIG.CONTENT.MAX_WORD_COUNT) {
      result.warnings.push(
        `Content is very long (${wordCount} words). Consider breaking it into smaller sections.`
      );
    }

    // Check for empty content
    if (!content || content.trim().length === 0) {
      result.errors.push("Content is empty");
      result.isValid = false;
    }

    return result;
  }

  /**
   * Extract text content from various sources
   */
  static extractTextContent(files) {
    if (!files || !Array.isArray(files)) {
      return "";
    }

    const contentFiles = files.filter((file) => file.type === "content");

    if (contentFiles.length === 0) {
      return "";
    }

    // Combine content from multiple files
    const combinedContent = contentFiles
      .map((file) => {
        const separator = `\n\n=== ${file.filename} ===\n\n`;
        return separator + file.content;
      })
      .join("\n\n");

    return combinedContent.trim();
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes) {
    const sizes = ["Bytes", "KB", "MB", "GB"];
    if (bytes === 0) return "0 Bytes";

    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = bytes / Math.pow(1024, i);

    return Math.round(size * 100) / 100 + " " + sizes[i];
  }

  /**
   * Get file type icon based on extension
   */
  static getFileTypeIcon(filename) {
    const extension = this.getFileExtension(filename);

    switch (extension) {
      case "txt":
        return "file-text";
      case "docx":
        return "file-text";
      case "json":
        return "file-code";
      default:
        return "file";
    }
  }

  /**
   * Check if browser supports required APIs
   */
  static checkBrowserSupport() {
    const support = {
      fileReader: typeof FileReader !== "undefined",
      mammoth: typeof mammoth !== "undefined",
      dragAndDrop: "draggable" in document.createElement("div"),
      localStorage: (() => {
        try {
          localStorage.setItem("test", "test");
          localStorage.removeItem("test");
          return true;
        } catch (e) {
          return false;
        }
      })(),
    };

    support.allSupported = Object.values(support).every(Boolean);

    return support;
  }

  /**
   * Create a file from text content
   */
  static createFileFromText(content, filename, mimeType = "text/plain") {
    const blob = new Blob([content], { type: mimeType });
    return new File([blob], filename, { type: mimeType });
  }

  /**
   * Download processed content as file
   */
  static downloadAsFile(content, filename, mimeType = "application/json") {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Clean up the URL object
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 100);
  }

  /**
   * Get processing statistics
   */
  static getProcessingStats(files) {
    if (!files || !Array.isArray(files)) {
      return {
        totalFiles: 0,
        totalSize: 0,
        totalWords: 0,
        fileTypes: {},
        contentFiles: 0,
        courseFiles: 0,
        avgProcessingTime: 0,
        slowFiles: 0,
      };
    }

    const stats = {
      totalFiles: files.length,
      totalSize: 0,
      totalWords: 0,
      fileTypes: {},
      contentFiles: 0,
      courseFiles: 0,
      avgProcessingTime: 0,
      slowFiles: 0,
    };

    let totalProcessingTime = 0;

    files.forEach((file) => {
      stats.totalSize += file.size || 0;
      stats.totalWords += file.wordCount || 0;

      const extension = this.getFileExtension(file.filename);
      stats.fileTypes[extension] = (stats.fileTypes[extension] || 0) + 1;

      if (file.type === "content") {
        stats.contentFiles++;
      } else if (file.type === "course") {
        stats.courseFiles++;
      }

      // Track processing performance
      const processingTime = file.metadata?.processingTime || 0;
      totalProcessingTime += processingTime;

      if (processingTime > 5000) {
        stats.slowFiles++;
      }
    });

    stats.avgProcessingTime =
      files.length > 0 ? Math.round(totalProcessingTime / files.length) : 0;

    return stats;
  }
}
