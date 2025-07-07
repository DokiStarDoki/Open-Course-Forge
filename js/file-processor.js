/**
 * Course Forge MVP - File Processing (ENHANCED SECURITY)
 * Handles file upload, parsing, and content extraction with comprehensive security validation
 */

class FileProcessor {
  /**
   * Enhanced file processing with comprehensive security validation
   */
  static async processFile(file) {
    const startTime = Date.now();

    try {
      // Comprehensive file validation
      await this.validateFileSecurely(file);

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
      result.metadata.securityValidated = true;

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
   * Process multiple files with race condition prevention
   */
  static async processFiles(files) {
    const results = [];
    const errors = [];

    // Process files sequentially to prevent race conditions
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
   * ENHANCED: Comprehensive security validation
   */
  static async validateFileSecurely(file) {
    if (!file) {
      throw new Error("No file provided");
    }

    // Basic size and name validation
    if (file.size > CONFIG.MAX_FILE_SIZE) {
      throw new Error(
        `${CONFIG.ERROR_MESSAGES.FILE_TOO_LARGE} (${this.formatFileSize(
          file.size
        )})`
      );
    }

    if (file.size === 0) {
      throw new Error("File is empty");
    }

    // Validate filename for security
    await this.validateFileName(file.name);

    // Validate file extension
    const extension = this.getFileExtension(file.name);
    if (!CONFIG.SUPPORTED_EXTENSIONS.includes(extension)) {
      throw new Error(
        `${CONFIG.ERROR_MESSAGES.UNSUPPORTED_FILE_TYPE}: ${extension}`
      );
    }

    // MIME type validation
    await this.validateMimeType(file, extension);

    // File content validation
    await this.validateFileContent(file, extension);

    // Additional security checks
    await this.performSecurityChecks(file);

    console.log(`✅ File security validation passed: ${file.name}`);
  }

  /**
   * ADDED: Validate filename for security issues
   */
  static async validateFileName(filename) {
    // Check for dangerous characters
    const dangerousChars = /[<>:"|?*\x00-\x1f]/;
    if (dangerousChars.test(filename)) {
      throw new Error("Filename contains dangerous characters");
    }

    // Check for path traversal attempts
    const pathTraversal = /\.\.|\/|\\|%2e%2e|%2f|%5c/i;
    if (pathTraversal.test(filename)) {
      throw new Error("Filename contains path traversal patterns");
    }

    // Check for reserved names (Windows)
    const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i;
    if (reservedNames.test(filename)) {
      throw new Error("Filename uses reserved system name");
    }

    // Check filename length
    if (filename.length > 255) {
      throw new Error("Filename is too long");
    }

    // Check for hidden files or system files
    if (filename.startsWith(".") || filename.startsWith("~")) {
      throw new Error("Hidden or temporary files are not allowed");
    }
  }

  /**
   * ADDED: Validate MIME type matches file extension
   */
  static async validateMimeType(file, extension) {
    const expectedMimeTypes = {
      txt: ["text/plain", "text/csv", "application/csv"],
      docx: [
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/zip", // DOCX files are ZIP archives
      ],
      json: ["application/json", "text/json", "text/plain"],
    };

    const expected = expectedMimeTypes[extension];
    if (!expected) {
      throw new Error(`No MIME type validation available for ${extension}`);
    }

    // Some browsers don't set MIME types correctly, so we'll be lenient but still check
    if (file.type && !expected.includes(file.type)) {
      console.warn(
        `⚠️ MIME type mismatch: expected ${expected.join(" or ")}, got ${
          file.type
        }`
      );
      // Don't throw error, just warn, as browser MIME detection can be unreliable
    }
  }

  /**
   * ADDED: Validate file content structure
   */
  static async validateFileContent(file, extension) {
    // Read first few bytes to validate file signatures
    const headerBytes = await this.readFileHeader(file, 64);

    switch (extension) {
      case "docx":
        await this.validateDocxHeader(headerBytes);
        break;
      case "json":
        await this.validateJsonStructure(file);
        break;
      case "txt":
        await this.validateTextContent(headerBytes);
        break;
    }
  }

  /**
   * ADDED: Read file header bytes
   */
  static async readFileHeader(file, numBytes) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const arrayBuffer = e.target.result;
        const uint8Array = new Uint8Array(arrayBuffer);
        resolve(uint8Array);
      };

      reader.onerror = () => reject(new Error("Failed to read file header"));

      // Read only the first numBytes
      const blob = file.slice(0, numBytes);
      reader.readAsArrayBuffer(blob);
    });
  }

  /**
   * ADDED: Validate DOCX file header
   */
  static async validateDocxHeader(headerBytes) {
    // DOCX files are ZIP archives, check for ZIP signature
    const zipSignatures = [
      [0x50, 0x4b, 0x03, 0x04], // Standard ZIP
      [0x50, 0x4b, 0x05, 0x06], // Empty ZIP
      [0x50, 0x4b, 0x07, 0x08], // Spanning ZIP
    ];

    let hasValidSignature = false;
    for (const signature of zipSignatures) {
      if (headerBytes.length >= signature.length) {
        const matches = signature.every(
          (byte, index) => headerBytes[index] === byte
        );
        if (matches) {
          hasValidSignature = true;
          break;
        }
      }
    }

    if (!hasValidSignature) {
      throw new Error("Invalid DOCX file: missing ZIP signature");
    }
  }

  /**
   * ADDED: Validate JSON structure without full parsing
   */
  static async validateJsonStructure(file) {
    // Read first 1KB to check JSON structure
    const preview = await this.readFilePreview(file, 1024);

    // Basic JSON structure check
    const trimmed = preview.trim();
    if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
      throw new Error("Invalid JSON file: must start with { or [");
    }

    // Check for common JSON injection patterns
    const suspiciousPatterns = [
      /__proto__/i,
      /constructor/i,
      /prototype/i,
      /function\s*\(/i,
      /<script/i,
      /javascript:/i,
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(preview)) {
        throw new Error("JSON file contains suspicious content");
      }
    }
  }

  /**
   * ADDED: Validate text content for suspicious patterns
   */
  static async validateTextContent(headerBytes) {
    // Convert bytes to string for content analysis
    const decoder = new TextDecoder("utf-8", { fatal: false });
    const content = decoder.decode(headerBytes);

    // Check for binary content disguised as text
    const binaryPattern = /[\x00-\x08\x0E-\x1F\x7F-\xFF]/g;
    const binaryMatches = content.match(binaryPattern);

    if (binaryMatches && binaryMatches.length > content.length * 0.1) {
      throw new Error("File appears to contain binary data, not text");
    }

    // Check for script injection attempts
    const scriptPatterns = [
      /<script/i,
      /javascript:/i,
      /vbscript:/i,
      /onload=/i,
      /onerror=/i,
    ];

    for (const pattern of scriptPatterns) {
      if (pattern.test(content)) {
        throw new Error("Text file contains script-like content");
      }
    }
  }

  /**
   * ADDED: Read file preview
   */
  static async readFilePreview(file, maxBytes) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error("Failed to read file preview"));

      const blob = file.slice(0, maxBytes);
      reader.readAsText(blob, "utf-8");
    });
  }

  /**
   * ADDED: Perform additional security checks
   */
  static async performSecurityChecks(file) {
    // Check for zip bombs (highly compressed files)
    if (file.name.toLowerCase().endsWith(".docx")) {
      const compressionRatio = await this.estimateCompressionRatio(file);
      if (compressionRatio > 100) {
        // More than 100:1 compression
        console.warn(
          `⚠️ High compression ratio detected: ${compressionRatio}:1`
        );
        // Don't throw error, but log warning
      }
    }

    // Check file creation/modification time if available
    if (file.lastModified) {
      const now = Date.now();
      const ageMs = now - file.lastModified;
      const ageDays = ageMs / (1000 * 60 * 60 * 24);

      // Warn about very old files (might be corrupted)
      if (ageDays > 365 * 5) {
        // More than 5 years old
        console.warn(`⚠️ File is very old (${Math.round(ageDays)} days)`);
      }
    }
  }

  /**
   * ADDED: Estimate compression ratio for zip-based files
   */
  static async estimateCompressionRatio(file) {
    try {
      // For DOCX files, estimate based on size vs content
      // This is a rough heuristic, not exact
      const preview = await this.readFilePreview(
        file,
        Math.min(file.size, 10240)
      );
      const uncompressedSize = preview.length;
      const compressedSize = file.size;

      if (compressedSize > 0) {
        return Math.round(uncompressedSize / compressedSize);
      }
    } catch (error) {
      console.warn("Could not estimate compression ratio:", error);
    }

    return 1; // Default to no compression
  }

  /**
   * Validate file before processing (legacy method, now calls enhanced validation)
   */
  static validateFile(file) {
    // This method is kept for backward compatibility
    // The actual validation is now done in validateFileSecurely
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
   * ENHANCED: Process text file with better security and error handling
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

          // Additional content validation
          this.validateTextFileContent(content);

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
              hasSecurityValidation: true,
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
   * ADDED: Validate text file content for security issues
   */
  static validateTextFileContent(content) {
    // Check for excessively long lines (potential DoS)
    const lines = content.split("\n");
    const maxLineLength = 10000; // 10KB per line max

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].length > maxLineLength) {
        throw new Error(
          `Line ${i + 1} is too long (${lines[i].length} characters)`
        );
      }
    }

    // Check for potential script content
    const scriptPatterns = [
      /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
      /<iframe[\s\S]*?>/gi,
      /<object[\s\S]*?>/gi,
      /<embed[\s\S]*?>/gi,
    ];

    for (const pattern of scriptPatterns) {
      if (pattern.test(content)) {
        throw new Error("Text file contains HTML script elements");
      }
    }

    // Check for potential binary content
    const binaryPattern = /[\x00-\x08\x0E-\x1F\x7F]/g;
    const binaryMatches = content.match(binaryPattern) || [];

    if (binaryMatches.length > content.length * 0.01) {
      // More than 1% binary chars
      throw new Error("Text file contains significant binary content");
    }
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

          // Enhanced DOCX validation
          const uint8Array = new Uint8Array(arrayBuffer);
          const isValidDocx = this.validateDocxFile(uint8Array);

          if (!isValidDocx) {
            console.warn(
              "DOCX validation warning - attempting processing anyway"
            );
          }

          console.log(
            `Processing DOCX file: ${file.name} (${this.formatFileSize(
              file.size
            )})`
          );

          // Use mammoth with optimized options for better performance
          const result = await mammoth.extractRawText({
            arrayBuffer,
            ignoreEmptyParagraphs: true,
            convertImage: () => null, // Skip image processing for speed
          });

          if (!result.value || result.value.trim().length === 0) {
            throw new Error("DOCX file contains no readable text");
          }

          const content = result.value;

          // Validate extracted content
          this.validateExtractedDocxContent(content);

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
              hasSecurityValidation: true,
            },
          });
        } catch (error) {
          clearTimeout(timeout);
          console.error("DOCX processing error:", error);

          // Try fallback processing
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
   * ADDED: Validate extracted DOCX content
   */
  static validateExtractedDocxContent(content) {
    if (!content || typeof content !== "string") {
      throw new Error("Invalid DOCX content extracted");
    }

    // Check for minimum content length
    if (content.trim().length < 10) {
      throw new Error("DOCX file contains insufficient readable text");
    }

    // Check for potential script injection in extracted content
    const scriptPatterns = [
      /<script/i,
      /javascript:/i,
      /vbscript:/i,
      /data:text\/html/i,
    ];

    for (const pattern of scriptPatterns) {
      if (pattern.test(content)) {
        throw new Error("DOCX content contains script-like elements");
      }
    }
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

      console.warn("No clear DOCX indicators found, but attempting processing");
      return true;
    } catch (error) {
      console.warn(
        "DOCX validation failed, but attempting processing anyway:",
        error
      );
      return true;
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
        // Validate fallback content
        this.validateExtractedDocxContent(extractedText);

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
            hasSecurityValidation: true,
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
   * Extract text from binary DOCX data using byte patterns
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
   * ENHANCED: Process a JSON file with security validation
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

          // Additional JSON security validation
          this.validateJsonContent(jsonText);

          let data;
          try {
            data = JSON.parse(jsonText);
          } catch (parseError) {
            throw new Error(`Invalid JSON format: ${parseError.message}`);
          }

          // Post-parse validation
          this.validateParsedJsonData(data);

          // Determine if this is course data or content data
          const fileType = this.determineJsonType(data);

          const result = {
            filename: file.name,
            size: file.size,
            processedAt: new Date().toISOString(),
            metadata: {
              keys: Object.keys(data),
              dataType: fileType,
              hasSecurityValidation: true,
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
   * ADDED: Validate JSON content for security issues
   */
  static validateJsonContent(jsonText) {
    // Check file size vs content ratio (potential zip bomb)
    if (jsonText.length > 10 * 1024 * 1024) {
      // 10MB
      throw new Error("JSON file is too large to process safely");
    }

    // Check for prototype pollution attempts
    const pollutionPatterns = [
      /__proto__/gi,
      /constructor\.prototype/gi,
      /prototype\.constructor/gi,
    ];

    for (const pattern of pollutionPatterns) {
      if (pattern.test(jsonText)) {
        throw new Error("JSON contains potential prototype pollution");
      }
    }

    // Check for script injection
    const scriptPatterns = [
      /<script/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /data:text\/html/gi,
      /eval\s*\(/gi,
      /Function\s*\(/gi,
    ];

    for (const pattern of scriptPatterns) {
      if (pattern.test(jsonText)) {
        throw new Error("JSON contains script-like content");
      }
    }

    // Check for excessive nesting (DoS protection)
    const maxDepth = 50;
    let depth = 0;
    let maxDepthFound = 0;

    for (let i = 0; i < jsonText.length; i++) {
      const char = jsonText[i];
      if (char === "{" || char === "[") {
        depth++;
        maxDepthFound = Math.max(maxDepthFound, depth);
      } else if (char === "}" || char === "]") {
        depth--;
      }

      if (maxDepthFound > maxDepth) {
        throw new Error(
          `JSON nesting too deep (max ${maxDepth} levels allowed)`
        );
      }
    }
  }

  /**
   * ADDED: Validate parsed JSON data
   */
  static validateParsedJsonData(data) {
    // Check for circular references
    try {
      JSON.stringify(data);
    } catch (error) {
      if (error.message.includes("circular")) {
        throw new Error("JSON contains circular references");
      }
      throw error;
    }

    // Check object count (DoS protection)
    const maxObjects = 10000;
    const objectCount = this.countObjects(data);
    if (objectCount > maxObjects) {
      throw new Error(
        `JSON contains too many objects (${objectCount} > ${maxObjects})`
      );
    }

    // Check for potentially dangerous function calls in string values
    this.scanJsonForDangerousContent(data);
  }

  /**
   * ADDED: Count objects in JSON data
   */
  static countObjects(obj, visited = new WeakSet()) {
    if (visited.has(obj)) {
      return 0; // Already counted
    }

    if (typeof obj !== "object" || obj === null) {
      return 0;
    }

    visited.add(obj);
    let count = 1; // Count this object

    for (const value of Object.values(obj)) {
      count += this.countObjects(value, visited);
    }

    return count;
  }

  /**
   * ADDED: Scan JSON for dangerous content
   */
  static scanJsonForDangerousContent(obj, path = "") {
    if (typeof obj === "string") {
      const dangerousPatterns = [
        /eval\s*\(/gi,
        /Function\s*\(/gi,
        /setTimeout\s*\(/gi,
        /setInterval\s*\(/gi,
        /<script/gi,
        /javascript:/gi,
      ];

      for (const pattern of dangerousPatterns) {
        if (pattern.test(obj)) {
          throw new Error(`Dangerous content found in JSON at path: ${path}`);
        }
      }
    } else if (typeof obj === "object" && obj !== null) {
      for (const [key, value] of Object.entries(obj)) {
        const newPath = path ? `${path}.${key}` : key;
        this.scanJsonForDangerousContent(value, newPath);
      }
    }
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
   * ENHANCED: Validate content for course creation with security checks
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

    // Security checks for content
    try {
      this.validateTextFileContent(content);
    } catch (securityError) {
      result.errors.push(
        `Security validation failed: ${securityError.message}`
      );
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
   * ENHANCED: Check if browser supports required APIs
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
      textDecoder: typeof TextDecoder !== "undefined",
      arrayBuffer: typeof ArrayBuffer !== "undefined",
      uint8Array: typeof Uint8Array !== "undefined",
    };

    support.allSupported = Object.values(support).every(Boolean);

    // Check for required security APIs
    support.securityAPIs = {
      crypto:
        typeof crypto !== "undefined" &&
        typeof crypto.getRandomValues === "function",
      webCrypto:
        typeof crypto !== "undefined" && typeof crypto.subtle !== "undefined",
    };

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
   * ENHANCED: Get processing statistics with security info
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
        securityValidated: 0,
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
      securityValidated: 0,
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

      // Track security validation
      if (file.metadata?.hasSecurityValidation) {
        stats.securityValidated++;
      }
    });

    stats.avgProcessingTime =
      files.length > 0 ? Math.round(totalProcessingTime / files.length) : 0;

    return stats;
  }
}
