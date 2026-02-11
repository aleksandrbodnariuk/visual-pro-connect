

# Plan: Fix Image Cropping, Add Editor to Main Page, Fix Preview

## Problem Analysis

Based on the screenshots and code review, there are three distinct root causes:

### Root Cause 1: Canvas rendering bug in ImageCropEditor

The `handleComplete` function in `ImageCropEditor.tsx` (line 94-97) uses `window.devicePixelRatio` to scale the canvas. On Retina screens (pixelRatio=2), this creates a canvas 2x-4x larger than the natural image. The drawing logic then uses complex transforms that don't correctly account for this pixel ratio scaling, resulting in the output image being cropped from the right and bottom.

The fix: remove `pixelRatio` entirely and use the simpler, more reliable `drawImage(image, sourceX, sourceY, sourceW, sourceH, 0, 0, destW, destH)` approach for the common case (no rotation, no zoom).

### Root Cause 2: No image editor on main page (NewsFeed.tsx)

The main page's post creation form in `NewsFeed.tsx` has its own file handler (`handleFileSelect`, line 108) that directly sets the file as preview without opening the `ImageCropEditor`. The profile page (`CreatePostBar.tsx`) already has the editor integrated, but the main page does not.

### Root Cause 3: Preview image clipped on main page

The image preview in `NewsFeed.tsx` (line 354) uses `object-cover`, which forces the image to fill the container and clips excess portions. This should be `object-contain` to show the full image.

---

## Changes

### 1. Fix `src/components/ui/ImageCropEditor.tsx` -- Fix canvas rendering

Rewrite the `handleComplete` function:

- Remove `window.devicePixelRatio` from canvas sizing and context scaling
- For the default case (no rotation, no zoom), use the direct `drawImage` with source rectangle -- this is the most reliable cropping method
- For rotation/zoom cases, keep the transform approach but without pixelRatio
- This ensures the output image matches exactly what the user sees in the editor

### 2. Fix `src/components/feed/NewsFeed.tsx` -- Add image editor + fix preview

- Import `ImageCropEditor`, `compressImageAsFile`, and `dataUrlToBlob`
- Add state variables for the image editor (`showImageEditor`, `originalImageSrc`)
- Modify `handleFileSelect`: when user selects an image, open the `ImageCropEditor` instead of setting the preview directly
- Add `handleCropComplete` function that compresses the edited image and sets it as the file to upload
- Add `handleEditorClose` function
- Change the image preview CSS from `object-cover` to `object-contain` so the full image is visible before publishing
- Add an edit button overlay on the image preview (like the profile page has)
- Render the `ImageCropEditor` dialog at the end of the component

---

## Files to Modify (2 total)

| File | Change |
|------|--------|
| `src/components/ui/ImageCropEditor.tsx` | Rewrite `handleComplete` to remove pixelRatio and use reliable drawImage approach |
| `src/components/feed/NewsFeed.tsx` | Add ImageCropEditor integration, fix preview styling, add compression |

## Expected Result

1. The image editor will open when uploading photos from both the main page and profile page
2. After clicking "Apply" in the editor, the full uncropped image will appear in the preview
3. The published image in the feed will display in full without any cropping

