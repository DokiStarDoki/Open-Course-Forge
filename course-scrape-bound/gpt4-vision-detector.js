// GPT4VisionDetector.js - Core API and analysis logic
class GPT4VisionDetector {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.headers = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + apiKey
        };
        this.apiCallCount = 0;
    }

    async loadPrompt() {
        try {
            const response = await fetch('./prompt.txt');
            if (!response.ok) {
                throw new Error(`Failed to load prompt.txt: ${response.status} ${response.statusText}. Make sure prompt.txt exists in the same folder as index.html`);
            }
            return await response.text();
        } catch (error) {
            console.error('Error loading prompt:', error);
            throw error;
        }
    }

    async fileToBase64DataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    async analyzeImageForButtons(imageFile) {
        try {
            const base64DataURL = await this.fileToBase64DataURL(imageFile);
            const promptText = await this.loadPrompt('./prompt.txt');

            const requestBody = {
                model: "gpt-4o",
                messages: [{
                    role: "user",
                    content: [{
                        type: "text",
                        text: promptText
                    }, {
                        type: "image_url",
                        image_url: {
                            url: base64DataURL,
                            detail: "high"
                        }
                    }]
                }],
                max_tokens: 2000,
                temperature: 0.1
            };

            console.log('Sending request to GPT-4 Vision API...');
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error('OpenAI API error: ' + response.status + ' - ' + errorText);
            }

            const result = await response.json();
            const content = result.choices[0].message.content;
            
            const analysisResult = this.parseAnalysisFromXML(content);
            
            if (typeof debugLogger !== 'undefined') {
                debugLogger.addLog('api-response', 'Raw GPT-4V Response', {
                    rawContent: content,
                    parsedResult: analysisResult
                });
            }
            
            return analysisResult;
            
        } catch (error) {
            console.error('Error in analyzeImageForButtons:', error);
            throw error;
        }
    }

    async analyzeImageForButtonsWithContext(imageFile, targetButton) {
        try {
            const base64DataURL = await this.fileToBase64DataURL(imageFile);
            const basePrompt = await this.loadPrompt('./prompt.txt');
            
            const contextualPrompt = basePrompt + "\n\nSPECIFIC SEARCH CONTEXT:\nI am specifically looking for a button/element called \"" + targetButton.reference_name + "\" that was described as: \"" + targetButton.description + "\". This element should be of type \"" + targetButton.element_type + "\" and was detected with " + targetButton.confidence + "% confidence. Please focus on finding this specific element in this cropped image section.";

            const requestBody = {
                model: "gpt-4o",
                messages: [{
                    role: "user",
                    content: [{
                        type: "text",
                        text: contextualPrompt
                    }, {
                        type: "image_url",
                        image_url: {
                            url: base64DataURL,
                            detail: "high"
                        }
                    }]
                }],
                max_tokens: 2000,
                temperature: 0.1
            };

            console.log('Sending contextual request to GPT-4 Vision API...');
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error('OpenAI API error: ' + response.status + ' - ' + errorText);
            }

            const result = await response.json();
            const content = result.choices[0].message.content;
            
            const analysisResult = this.parseAnalysisFromXML(content);
            
            if (typeof debugLogger !== 'undefined') {
                debugLogger.addLog('contextual-analysis', 'Contextual Analysis Result', {
                    targetButton: targetButton.reference_name,
                    rawContent: content,
                    parsedResult: analysisResult
                });
            }
            
            return analysisResult;
            
        } catch (error) {
            console.error('Error in contextual analysis:', error);
            throw error;
        }
    }

    // XML parsing method to handle LLM response inconsistencies
    parseAnalysisFromXML(content) {
        try {
            // Extract detected buttons using regex
            const buttonsMatch = content.match(/<detected_buttons>([\s\S]*?)<\/detected_buttons>/);
            const summaryMatch = content.match(/<analysis_summary>([\s\S]*?)<\/analysis_summary>/);
            
            let detectedButtons = [];
            let analysisSummary = {
                total_elements_found: 0,
                image_description: "No description available"
            };

            if (buttonsMatch) {
                const buttonsXML = buttonsMatch[1];
                
                // Extract individual button elements
                const buttonMatches = buttonsXML.match(/<button>([\s\S]*?)<\/button>/g);
                
                if (buttonMatches) {
                    detectedButtons = buttonMatches.map(buttonXML => {
                        const button = {};
                        
                        // Extract each field with regex
                        const fields = {
                            reference_name: /<reference_name>(.*?)<\/reference_name>/,
                            description: /<description>([\s\S]*?)<\/description>/,
                            element_type: /<element_type>(.*?)<\/element_type>/,
                            confidence: /<confidence>(\d+)<\/confidence>/,
                            bbox_x: /<bbox_x>(\d+)<\/bbox_x>/,
                            bbox_y: /<bbox_y>(\d+)<\/bbox_y>/,
                            bbox_width: /<bbox_width>(\d+)<\/bbox_width>/,
                            bbox_height: /<bbox_height>(\d+)<\/bbox_height>/
                        };
                        
                        for (const [key, regex] of Object.entries(fields)) {
                            const match = buttonXML.match(regex);
                            if (match) {
                                if (key === 'confidence' || key === 'bbox_x' || key === 'bbox_y' || key === 'bbox_width' || key === 'bbox_height') {
                                    button[key] = parseInt(match[1]);
                                } else {
                                    button[key] = match[1].trim();
                                }
                            }
                        }
                        
                        // Convert to expected format with center coordinates
                        return {
                            reference_name: button.reference_name || 'unknown_button',
                            description: button.description || 'No description',
                            element_type: button.element_type || 'button',
                            confidence: button.confidence || 50,
                            center_coordinates: {
                                x: (button.bbox_x || 0) + (button.bbox_width || 50) / 2,
                                y: (button.bbox_y || 0) + (button.bbox_height || 30) / 2
                            },
                            estimated_size: {
                                width: button.bbox_width || 50,
                                height: button.bbox_height || 30
                            }
                        };
                    });
                }
            }

            if (summaryMatch) {
                const summaryXML = summaryMatch[1];
                
                const totalMatch = summaryXML.match(/<total_elements_found>(\d+)<\/total_elements_found>/);
                const descMatch = summaryXML.match(/<image_description>([\s\S]*?)<\/image_description>/);
                
                if (totalMatch) analysisSummary.total_elements_found = parseInt(totalMatch[1]);
                if (descMatch) analysisSummary.image_description = descMatch[1].trim();
            }

            // If no XML found, try to fallback to JSON parsing
            if (detectedButtons.length === 0) {
                console.log('No XML tags found, attempting JSON fallback...');
                try {
                    const jsonResult = JSON.parse(content);
                    return jsonResult;
                } catch (jsonError) {
                    console.log('JSON fallback also failed, returning empty result');
                    return {
                        detected_buttons: [],
                        analysis_summary: {
                            total_elements_found: 0,
                            image_description: "Failed to parse response - content may be explanatory text instead of structured data"
                        }
                    };
                }
            }

            return {
                detected_buttons: detectedButtons,
                analysis_summary: analysisSummary
            };

        } catch (error) {
            console.error('Error parsing XML response:', error);
            return {
                detected_buttons: [],
                analysis_summary: {
                    total_elements_found: 0,
                    image_description: "Error parsing response: " + error.message
                }
            };
        }
    }
}