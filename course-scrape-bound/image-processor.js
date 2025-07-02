// ImageProcessor.js - Image manipulation and overlay creation
class ImageProcessor {
    constructor() {
        this.sliceVisualizations = [];
    }

    // Create visual overlay with bounding boxes and cross-grid system drawn on the image
    async createBoundingBoxOverlay(originalFile, buttons, cycleNumber) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    canvas.width = img.width;
                    canvas.height = img.height;
                    
                    // Draw the original image
                    ctx.drawImage(img, 0, 0);
                    
                    // Draw bounding boxes with cross-grid system
                    buttons.forEach((button, index) => {
                        const bbox = button.bounding_box;
                        
                        // Different colors for different cycles
                        const colors = ['#ff0000', '#00ff00', '#0000ff', '#ff00ff'];
                        const color = colors[(cycleNumber - 1) % colors.length];
                        
                        // Draw bounding box
                        ctx.strokeStyle = color;
                        ctx.lineWidth = 3;
                        ctx.strokeRect(bbox.x, bbox.y, bbox.width, bbox.height);
                        
                        // Draw cross to create quadrants
                        const centerX = bbox.x + bbox.width / 2;
                        const centerY = bbox.y + bbox.height / 2;
                        
                        ctx.strokeStyle = color;
                        ctx.lineWidth = 2;
                        ctx.setLineDash([5, 5]); // Dashed lines for the cross
                        
                        // Vertical line of cross
                        ctx.beginPath();
                        ctx.moveTo(centerX, bbox.y);
                        ctx.lineTo(centerX, bbox.y + bbox.height);
                        ctx.stroke();
                        
                        // Horizontal line of cross
                        ctx.beginPath();
                        ctx.moveTo(bbox.x, centerY);
                        ctx.lineTo(bbox.x + bbox.width, centerY);
                        ctx.stroke();
                        
                        ctx.setLineDash([]); // Reset to solid lines
                        
                        // Draw quadrant numbers
                        ctx.fillStyle = color;
                        ctx.font = 'bold 16px Arial';
                        const quadrantOffset = 8;
                        
                        // Quadrant 1 (top-left)
                        ctx.fillText('1', bbox.x + quadrantOffset, bbox.y + 20);
                        // Quadrant 2 (top-right)  
                        ctx.fillText('2', centerX + quadrantOffset, bbox.y + 20);
                        // Quadrant 3 (bottom-left)
                        ctx.fillText('3', bbox.x + quadrantOffset, centerY + 20);
                        // Quadrant 4 (bottom-right)
                        ctx.fillText('4', centerX + quadrantOffset, centerY + 20);
                        
                        // Draw main label with button info
                        const labelText = `#${index + 1}: ${button.reference_name}`;
                        const labelPadding = 6;
                        const labelHeight = 24;
                        
                        // Label background
                        ctx.fillStyle = color;
                        ctx.fillRect(bbox.x, bbox.y - labelHeight - 2, ctx.measureText(labelText).width + labelPadding * 2, labelHeight);
                        
                        // Label text
                        ctx.fillStyle = 'white';
                        ctx.font = 'bold 14px Arial';
                        ctx.fillText(labelText, bbox.x + labelPadding, bbox.y - 8);
                        
                        // Draw center intersection point
                        ctx.fillStyle = color;
                        ctx.beginPath();
                        ctx.arc(centerX, centerY, 6, 0, 2 * Math.PI);
                        ctx.fill();
                        
                        // Add white border to center point for visibility
                        ctx.strokeStyle = 'white';
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.arc(centerX, centerY, 6, 0, 2 * Math.PI);
                        ctx.stroke();
                    });
                    
                    // Convert canvas to blob URL
                    canvas.toBlob((blob) => {
                        if (blob) {
                            const overlayUrl = URL.createObjectURL(blob);
                            resolve(overlayUrl);
                        } else {
                            reject(new Error('Failed to create overlay image'));
                        }
                    }, 'image/png');
                } catch (error) {
                    reject(error);
                }
            };
            
            img.onerror = () => reject(new Error('Failed to load image for overlay'));
            img.src = URL.createObjectURL(originalFile);
        });
    }

    // Create a focused crop around a specific button
    createFocusedCrop(button, imageDimensions, depth) {
        const x = button.center_coordinates.x;
        const y = button.center_coordinates.y;
        
        // Calculate crop size based on depth - smaller crops for deeper levels
        let cropSizeMultiplier;
        if (depth === 0) {
            cropSizeMultiplier = 0.4; // 40% of image dimensions
        } else if (depth === 1) {
            cropSizeMultiplier = 0.6; // 60% of current dimensions (tighter focus)
        } else {
            cropSizeMultiplier = 0.8; // 80% of current dimensions (very tight)
        }
        
        const cropWidth = Math.min(imageDimensions.width * cropSizeMultiplier, imageDimensions.width);
        const cropHeight = Math.min(imageDimensions.height * cropSizeMultiplier, imageDimensions.height);
        
        // Center the crop on the button coordinates
        const cropX = Math.max(0, Math.min(x - cropWidth/2, imageDimensions.width - cropWidth));
        const cropY = Math.max(0, Math.min(y - cropHeight/2, imageDimensions.height - cropHeight));
        
        return {
            x: Math.round(cropX),
            y: Math.round(cropY),
            width: Math.round(cropWidth),
            height: Math.round(cropHeight)
        };
    }

    async createCroppedImage(originalFile, cropBounds) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    canvas.width = cropBounds.width;
                    canvas.height = cropBounds.height;
                    
                    ctx.drawImage(
                        img,
                        cropBounds.x, cropBounds.y, cropBounds.width, cropBounds.height,
                        0, 0, cropBounds.width, cropBounds.height
                    );
                    
                    canvas.toBlob((blob) => {
                        if (blob) {
                            const croppedFile = new File([blob], 'cropped.png', { type: 'image/png' });
                            resolve(croppedFile);
                        } else {
                            reject(new Error('Failed to create cropped image blob'));
                        }
                    }, 'image/png');
                } catch (error) {
                    reject(error);
                }
            };
            
            img.onerror = () => reject(new Error('Failed to load image for cropping'));
            img.src = URL.createObjectURL(originalFile);
        });
    }

    // Calculate how much of the crop the button takes up
    calculateButtonCoverage(button, cropBounds) {
        const buttonArea = button.estimated_size.width * button.estimated_size.height;
        const cropArea = cropBounds.width * cropBounds.height;
        return buttonArea / cropArea;
    }

    transformCoordinates(cropCoordinates, cropBounds, transformHistory) {
        let x = cropCoordinates.x + cropBounds.x;
        let y = cropCoordinates.y + cropBounds.y;
        
        // Apply any previous transformations
        transformHistory.forEach(transform => {
            x += transform.x;
            y += transform.y;
        });
        
        return { x: Math.round(x), y: Math.round(y) };
    }

    groupButtonsByRegion(buttons, imageWidth, imageHeight) {
        const regions = {
            'top-left': [],
            'top-right': [],
            'bottom-left': [],
            'bottom-right': [],
            'center': []
        };
        
        const centerX = imageWidth / 2;
        const centerY = imageHeight / 2;
        const centerMargin = Math.min(imageWidth, imageHeight) * 0.2;
        
        buttons.forEach(button => {
            const x = button.center_coordinates.x;
            const y = button.center_coordinates.y;
            
            // Check if button is in center region
            if (Math.abs(x - centerX) < centerMargin && Math.abs(y - centerY) < centerMargin) {
                regions.center.push(button);
            }
            // Otherwise, assign to quadrants
            else if (x < centerX && y < centerY) {
                regions['top-left'].push(button);
            }
            else if (x >= centerX && y < centerY) {
                regions['top-right'].push(button);
            }
            else if (x < centerX && y >= centerY) {
                regions['bottom-left'].push(button);
            }
            else {
                regions['bottom-right'].push(button);
            }
        });
        
        // Only return regions that have buttons
        const nonEmptyRegions = {};
        for (const region in regions) {
            if (regions[region].length > 0) {
                nonEmptyRegions[region] = regions[region];
            }
        }
        
        return nonEmptyRegions;
    }

    getRegionBounds(region, imageWidth, imageHeight) {
        const centerX = imageWidth / 2;
        const centerY = imageHeight / 2;
        const centerMargin = Math.min(imageWidth, imageHeight) * 0.2;
        
        switch (region) {
            case 'top-left':
                return {
                    x: 0,
                    y: 0,
                    width: centerX,
                    height: centerY
                };
            case 'top-right':
                return {
                    x: centerX,
                    y: 0,
                    width: centerX,
                    height: centerY
                };
            case 'bottom-left':
                return {
                    x: 0,
                    y: centerY,
                    width: centerX,
                    height: centerY
                };
            case 'bottom-right':
                return {
                    x: centerX,
                    y: centerY,
                    width: centerX,
                    height: centerY
                };
            case 'center':
                return {
                    x: centerX - centerMargin,
                    y: centerY - centerMargin,
                    width: centerMargin * 2,
                    height: centerMargin * 2
                };
            default:
                return {
                    x: 0,
                    y: 0,
                    width: imageWidth,
                    height: imageHeight
                };
        }
    }

    // Store slice visualization for debug purposes
    addSliceVisualization(slice) {
        this.sliceVisualizations.push(slice);
    }

    getSliceVisualizations() {
        return this.sliceVisualizations;
    }

    clearSliceVisualizations() {
        this.sliceVisualizations = [];
    }
}