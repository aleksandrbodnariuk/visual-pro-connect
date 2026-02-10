

# Plan: Fix Image Editor and Avatar/Banner Upload Issues

## Problem Summary

Three issues remain unfixed across the codebase:

1. **"Apply" button in image editor does nothing** -- `completedCrop` state is only set when user drags the crop area. If user just opens editor and clicks Apply, the function exits silently because `completedCrop` is undefined.

2. **Avatar and banner uploads fail with "Failed to fetch"** -- The code uses `fetch(dataUrl)` to convert a base64 data URL to a Blob. This method is unreliable with large data URLs and can fail in certain browsers/environments.

3. **Post image editor has the same fetch issue** -- Both `CreatePostBar` and `EditPublicationModal` use `fetch(croppedImageUrl)` to convert the cropped result.

## Changes

### 1. `src/lib/imageCompression.ts` -- Add `dataUrlToBlob` utility

Add a new exported function that converts a data URL to a Blob without using `fetch`:

```typescript
export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(parts[1]);
  const u8arr = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i++) {
    u8arr[i] = bstr.charCodeAt(i);
  }
  return new Blob([u8arr], { type: mime });
}
```

### 2. `src/components/ui/ImageCropEditor.tsx` -- Fix "Apply" button

- On `onImageLoad`, after setting the percent crop, also compute and set the initial `completedCrop` in pixel coordinates so the Apply button works immediately.
- Add `crossOrigin="anonymous"` to the `<img>` element for CORS compatibility with external storage URLs.

### 3. `src/components/profile/avatar/useAvatarUpload.tsx` -- Fix upload

Replace:
```typescript
const response = await fetch(compressedDataUrl);
const blob = await response.blob();
```
With:
```typescript
import { dataUrlToBlob } from '@/lib/imageCompression';
const blob = dataUrlToBlob(compressedDataUrl);
```

### 4. `src/components/profile/banner/useBannerUpload.tsx` -- Fix upload

Same replacement as avatar: use `dataUrlToBlob` instead of `fetch(dataUrl)`.

### 5. `src/components/profile/CreatePostBar.tsx` -- Fix crop handler

In `handleCropComplete`, replace `fetch(croppedImageUrl)` with `dataUrlToBlob(croppedImageUrl)`.

### 6. `src/components/publications/EditPublicationModal.tsx` -- Fix crop handler

Same replacement in `handleCropComplete`.

## Files Modified (6 total)

| File | Change |
|------|--------|
| `src/lib/imageCompression.ts` | Add `dataUrlToBlob()` function |
| `src/components/ui/ImageCropEditor.tsx` | Set initial `completedCrop` on image load; add `crossOrigin` |
| `src/components/profile/avatar/useAvatarUpload.tsx` | Use `dataUrlToBlob` instead of `fetch` |
| `src/components/profile/banner/useBannerUpload.tsx` | Use `dataUrlToBlob` instead of `fetch` |
| `src/components/profile/CreatePostBar.tsx` | Use `dataUrlToBlob` instead of `fetch` |
| `src/components/publications/EditPublicationModal.tsx` | Use `dataUrlToBlob` instead of `fetch` |

