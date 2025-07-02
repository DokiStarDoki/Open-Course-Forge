// ProgressiveSlicer.js - Progressive slicing analysis logic
class ProgressiveSlicer {
    constructor(detector, imageProcessor) {
        this.detector = detector;
        this.imageProcessor = imageProcessor;
    }

    // Progressive slicing analysis - the main method
    async analyzeWithProgressiveSlicing(originalFile, imageDimensions) {
        console.log('Starting progressive slicing analysis...');
        this.detector.apiCallCount = 1; // Count initial analysis
        
        // Initialize debug logging
        if (typeof debugLogger !== 'undefined') {
            debugLogger.clear();
            this.imageProcessor.clearSliceVisualizations();
            debugLogger.addLog('info', 'Progressive Slicing Started', {
                imageDimensions,
                timestamp: new Date().toISOString()
            });
        }
        
        try {
            // Step 1: Initial full image analysis
            const initialAnalysis = await this.detector.analyzeImageForButtons(originalFile);
            
            if (typeof debugLogger !== 'undefined') {
                debugLogger.addLog('api-call', 'Initial Full Image Analysis', {
                    callNumber: 1,
                    buttonsFound: initialAnalysis.detected_buttons?.length || 0,
                    response: initialAnalysis
                });
            }
            
            if (!initialAnalysis.detected_buttons || initialAnalysis.detected_buttons.length === 0) {
                return initialAnalysis;
            }
            
            console.log('Initial analysis found ' + initialAnalysis.detected_buttons.length + ' buttons');
            
            // Step 2: Start recursive slicing
            const refinedButtons = await this.recursiveSlicing(
                originalFile,
                initialAnalysis.detected_buttons,
                imageDimensions,
                [],
                0
            );
            
            if (typeof debugLogger !== 'undefined') {
                debugLogger.addLog('success', 'Progressive Slicing Completed', {
                    totalApiCalls: this.detector.apiCallCount,
                    finalButtonCount: refinedButtons.length,
                    slicesCreated: this.imageProcessor.getSliceVisualizations().length
                });
            }
            
            return Object.assign({}, initialAnalysis, {
                detected_buttons: refinedButtons,
                analysis_method: 'progressive_slicing',
                total_api_calls: this.detector.apiCallCount,
                debug_log: typeof debugLogger !== 'undefined' ? debugLogger.getLogs() : undefined,
                slice_visualizations: typeof debugLogger !== 'undefined' ? this.imageProcessor.getSliceVisualizations() : undefined
            });
        } catch (error) {
            if (typeof debugLogger !== 'undefined') {
                debugLogger.addLog('error', 'Progressive Slicing Failed', {
                    error: error.message,
                    apiCallsUsed: this.detector.apiCallCount
                });
            }
            console.error('Error in progressive slicing:', error);
            throw error;
        }
    }

    async recursiveSlicing(imageFile, buttons, imageDimensions, transformHistory, depth) {
        console.log('Slicing depth ' + depth + ', analyzing ' + buttons.length + ' buttons');
        
        if (typeof debugLogger !== 'undefined') {
            debugLogger.addLog('slice', `Recursive Slicing - Depth ${depth}`, {
                depth,
                buttonsToProcess: buttons.length,
                imageDimensions,
                transformHistory
            });
        }
        
        try {
            // Check stopping conditions - cap at depth 2
            if (depth >= 2) {
                console.log('Maximum depth reached: ' + depth);
                
                if (typeof debugLogger !== 'undefined') {
                    debugLogger.addLog('decision', `Maximum Depth Reached: ${depth}`, {
                        reason: 'Depth limit reached (2)',
                        finalButtons: buttons.length
                    });
                }
                
                return buttons.map(function(button) {
                    return Object.assign({}, button, {
                        refinement_level: depth,
                        transform_history: transformHistory
                    });
                });
            }

            // Check API call limit
            if (this.detector.apiCallCount >= 10) {
                console.log('API call limit reached: ' + this.detector.apiCallCount);
                
                if (typeof debugLogger !== 'undefined') {
                    debugLogger.addLog('decision', `API Call Limit Reached: ${this.detector.apiCallCount}`, {
                        reason: 'API call limit (10)',
                        finalButtons: buttons.length
                    });
                }
                
                return buttons.map(function(button) {
                    return Object.assign({}, button, {
                        refinement_level: depth,
                        transform_history: transformHistory
                    });
                });
            }
            
            // Process each button individually with focused cropping
            const refinedButtons = [];
            
            for (let i = 0; i < buttons.length; i++) {
                const button = buttons[i];
                console.log('Refining button: ' + button.reference_name);
                
                if (typeof debugLogger !== 'undefined') {
                    debugLogger.addLog('refine', `Refining button: ${button.reference_name}`, {
                        buttonName: button.reference_name,
                        originalCoords: button.center_coordinates,
                        confidence: button.confidence,
                        depth: depth
                    });
                }
                
                // Create a focused crop around this button
                const cropBounds = this.imageProcessor.createFocusedCrop(button, imageDimensions, depth);
                
                if (typeof debugLogger !== 'undefined') {
                    debugLogger.addLog('crop', `Focused crop for ${button.reference_name}`, {
                        buttonName: button.reference_name,
                        cropBounds,
                        depth: depth
                    });
                }
                
                // Create the cropped image
                const croppedFile = await this.imageProcessor.createCroppedImage(imageFile, cropBounds);
                
                // Store slice visualization
                if (typeof debugLogger !== 'undefined') {
                    const sliceVisualization = {
                        id: `refine_${depth}_${button.reference_name}`,
                        depth,
                        buttonName: button.reference_name,
                        cropBounds,
                        originalDimensions: imageDimensions,
                        originalCoords: button.center_coordinates,
                        croppedImageUrl: URL.createObjectURL(croppedFile),
                        timestamp: new Date().toISOString()
                    };
                    this.imageProcessor.addSliceVisualization(sliceVisualization);
                }
                
                // Analyze this focused crop
                this.detector.apiCallCount++;
                const cropAnalysis = await this.detector.analyzeImageForButtonsWithContext(croppedFile, button);
                
                if (typeof debugLogger !== 'undefined') {
                    debugLogger.addLog('api-response', `Focused analysis for ${button.reference_name}`, {
                        buttonName: button.reference_name,
                        callNumber: this.detector.apiCallCount,
                        buttonsFound: cropAnalysis.detected_buttons?.length || 0,
                        depth: depth
                    });
                }
                
                if (cropAnalysis.detected_buttons && cropAnalysis.detected_buttons.length > 0) {
                    // Found button in focused crop
                    const foundButton = cropAnalysis.detected_buttons[0]; // Take the best match
                    
                    // Transform coordinates back to original image space
                    const originalCoords = this.imageProcessor.transformCoordinates(
                        foundButton.center_coordinates,
                        cropBounds,
                        transformHistory
                    );
                    
                    if (typeof debugLogger !== 'undefined') {
                        debugLogger.addLog('math', `Coordinate transformation for ${button.reference_name}`, {
                            buttonName: button.reference_name,
                            cropCoordinates: foundButton.center_coordinates,
                            cropBounds,
                            transformHistory,
                            calculation: {
                                step1: `Crop coords: (${foundButton.center_coordinates.x}, ${foundButton.center_coordinates.y})`,
                                step2: `Add crop offset: (${foundButton.center_coordinates.x} + ${cropBounds.x}, ${foundButton.center_coordinates.y} + ${cropBounds.y})`,
                                step3: `Apply transform history: ${transformHistory.length > 0 ? transformHistory.map(t => `(+${t.x}, +${t.y})`).join(' ') : 'none'}`,
                                result: `Final coordinates: (${originalCoords.x}, ${originalCoords.y})`
                            },
                            originalCoords
                        });
                    }
                    
                    // Check if this is well-isolated (button takes up significant portion)
                    const buttonCoverageRatio = this.imageProcessor.calculateButtonCoverage(foundButton, cropBounds);
                    
                    if (typeof debugLogger !== 'undefined') {
                        debugLogger.addLog('coverage', `Coverage check for ${button.reference_name}`, {
                            buttonName: button.reference_name,
                            coverageRatio: buttonCoverageRatio,
                            isWellIsolated: buttonCoverageRatio >= 0.3,
                            depth: depth
                        });
                    }
                    
                    if (buttonCoverageRatio >= 0.3 || depth >= 1) {
                        // Button is well-isolated or we've gone deep enough
                        const refinedButton = Object.assign({}, foundButton, {
                            center_coordinates: originalCoords,
                            refinement_level: depth + 1,
                            transform_history: transformHistory,
                            coverage_ratio: buttonCoverageRatio,
                            refinement_successful: true
                        });
                        
                        if (typeof debugLogger !== 'undefined') {
                            debugLogger.addLog('success', `Successfully refined ${button.reference_name}`, {
                                buttonName: button.reference_name,
                                oldCoords: button.center_coordinates,
                                newCoords: originalCoords,
                                coverageRatio: buttonCoverageRatio,
                                depth: depth + 1
                            });
                        }
                        
                        refinedButtons.push(refinedButton);
                    } else {
                        // Need to go deeper - recursively refine this button
                        console.log('Button ' + button.reference_name + ' coverage ' + buttonCoverageRatio + ' < 0.3, going deeper');
                        
                        const deeperRefined = await this.recursiveSlicing(
                            croppedFile,
                            [Object.assign({}, foundButton, {
                                center_coordinates: foundButton.center_coordinates // Use crop-relative coordinates
                            })],
                            { width: cropBounds.width, height: cropBounds.height },
                            transformHistory.concat([{ x: cropBounds.x, y: cropBounds.y }]),
                            depth + 1
                        );
                        
                        refinedButtons.push.apply(refinedButtons, deeperRefined);
                    }
                } else {
                    // Button not found in focused crop, keep original
                    console.log('Button ' + button.reference_name + ' not found in focused crop, keeping original');
                    
                    if (typeof debugLogger !== 'undefined') {
                        debugLogger.addLog('fallback', `Button not found in crop: ${button.reference_name}`, {
                            buttonName: button.reference_name,
                            action: 'keeping_original',
                            depth: depth
                        });
                    }
                    
                    refinedButtons.push(Object.assign({}, button, {
                        refinement_level: depth,
                        transform_history: transformHistory,
                        refinement_failed: true
                    }));
                }
            }
            
            return refinedButtons;
            
        } catch (error) {
            if (typeof debugLogger !== 'undefined') {
                debugLogger.addLog('error', `Slicing Error at Depth ${depth}`, {
                    depth,
                    error: error.message,
                    buttonsBeingProcessed: buttons.length
                });
            }
            console.error('Error in recursive slicing at depth ' + depth + ':', error);
            // Return original buttons if slicing fails
            return buttons.map(function(button) {
                return Object.assign({}, button, {
                    refinement_level: depth,
                    transform_history: transformHistory,
                    slicing_error: true
                });
            });
        }
    }

    shouldStopSlicing(buttons, imageWidth, imageHeight, depth) {
        // Stop if we've gone too deep
        if (depth >= 3) {
            console.log('Max depth reached');
            return true;
        }
        
        // Stop if we have very few buttons
        if (buttons.length <= 1) {
            console.log('Too few buttons to slice further');
            return true;
        }
        
        // Stop if image is getting too small
        const minDimension = 200;
        if (imageWidth < minDimension || imageHeight < minDimension) {
            console.log('Image too small for further slicing');
            return true;
        }
        
        // Stop if API calls are getting excessive
        if (this.detector.apiCallCount >= 15) {
            console.log('API call limit reached');
            return true;
        }
        
        return false;
    }

    getStoppingReason(buttons, imageWidth, imageHeight, depth) {
        if (depth >= 3) return 'Maximum depth reached (3)';
        if (buttons.length <= 1) return 'Too few buttons to slice further';
        if (imageWidth < 200 || imageHeight < 200) return 'Image too small for further slicing';
        if (this.detector.apiCallCount >= 15) return 'API call limit reached (15)';
        return 'Unknown stopping condition';
    }
}