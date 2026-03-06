/**
 * stampProductCode
 * 
 * Loads an image onto an HTML Canvas, stamps a short product code badge
 * in the bottom-right corner, and returns a Blob of the resulting PNG.
 *
 * @param {string} imageUrl  - Public image URL or base64 data URL
 * @param {string} code      - Short product code, e.g. "ASR-042"
 * @returns {Promise<Blob>}
 */
export async function stampProductCode(imageUrl, code) {
    return new Promise((resolve, reject) => {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            // Badge dimensions
            const padding = 10;
            const fontSize = Math.max(20, Math.round(canvas.width * 0.035));
            ctx.font = `bold ${fontSize}px monospace`;

            const textWidth = ctx.measureText(code).width;
            const badgeW = textWidth + padding * 2;
            const badgeH = fontSize + padding * 2;

            // Smart positioning based on image aspect ratio
            const aspectRatio = canvas.width / canvas.height;
            let x, y;
            
            if (aspectRatio < 0.8) {
                // Portrait image - position in bottom right but ensure it doesn't overlap content
                x = canvas.width - badgeW - 12;
                y = canvas.height - badgeH - 12;
            } else {
                // Landscape/square image - standard bottom right positioning
                x = canvas.width - badgeW - 16;
                y = canvas.height - badgeH - 16;
            }
            
            // Ensure badge stays within image bounds
            x = Math.max(8, Math.min(x, canvas.width - badgeW - 8));
            y = Math.max(8, Math.min(y, canvas.height - badgeH - 8));

            // Background pill
            ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
            roundRect(ctx, x, y, badgeW, badgeH, 8);
            ctx.fill();

            // Border
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 1.5;
            roundRect(ctx, x, y, badgeW, badgeH, 8);
            ctx.stroke();

            // Text
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${fontSize}px monospace`;
            ctx.fillText(code, x + padding, y + fontSize + padding * 0.7);

            canvas.toBlob((blob) => {
                if (blob) resolve(blob);
                else reject(new Error('Canvas toBlob failed'));
            }, 'image/jpeg', 0.92);
        };

        img.onerror = () => reject(new Error('Failed to load image: ' + imageUrl));
        img.src = imageUrl;
    });
}

/**
 * Helper: draw a rounded rectangle path
 */
function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

/**
 * uploadWatermarkedImage
 * 
 * Takes a raw blob (from stampProductCode) and uploads it via the server
 * API route, returning the public URL.
 *
 * @param {Blob} blob
 * @param {string} code  - Used to name the file
 * @returns {Promise<string>} publicUrl
 */
export async function uploadWatermarkedImage(blob, catalogId) {
    const formData = new FormData();
    formData.append('file', blob, `${catalogId}-watermarked.jpg`);
    formData.append('catalogId', catalogId); // Pass catalog ID to upload

    console.log('Uploading watermarked image with catalog ID:', catalogId);
    
    const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
    });

    const data = await res.json();
    console.log('Upload response:', data);
    
    if (!res.ok) {
        console.error('Upload failed:', data.error);
        throw new Error(data.error || 'Upload failed');
    }
    
    console.log('Upload successful, URL:', data.url);
    return data.url;
}

