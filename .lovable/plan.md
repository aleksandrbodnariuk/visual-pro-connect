
# Plan: Fix Image Editor and Storage Upload Issues

## Issues Identified

### Issue 1: Image Editor "Apply" Button Not Responding
The `handleComplete` function in `ImageCropEditor.tsx` returns silently when `completedCrop` is undefined. This happens because `completedCrop` is only set when the user interacts with the crop area. If a user opens the editor and clicks "Apply" without adjusting the crop, nothing happens.

### Issue 2: Avatar/Banner Upload Fails with "Failed to fetch"
The compression utility converts a data URL to an image, then back to a data URL. Later, the upload hook uses `fetch(dataUrl)` to convert it to a Blob. This fetch on large data URLs can fail in certain browsers. Additionally, there may be cross-origin issues when loading images from external URLs for editing.

---

## Technical Solution

### Fix 1: ImageCropEditor - Handle Default Crop State

**File:** `src/components/ui/ImageCropEditor.tsx`

Changes:
- When the image loads, also set `completedCrop` with pixel values so "Apply" works immediately
- Add a fallback in `handleComplete` to use the current crop if `completedCrop` is not yet set
- Convert the percent crop to pixel crop when needed

```text
Logic flow:
1. onImageLoad -> set initial crop (percent)
2. Also calculate and set initial completedCrop (pixels)
3. handleComplete now has valid data even without user interaction
```

### Fix 2: Avatar/Banner Upload - Fix Data URL Conversion

**Files:** 
- `src/components/profile/avatar/useAvatarUpload.tsx`
- `src/components/profile/banner/useBannerUpload.tsx`

Changes:
- Replace `fetch(dataUrl).then(res => res.blob())` with a more reliable conversion method
- Use a helper function that converts data URL to Blob without fetch
- Add proper error handling and logging

```text
Helper function (add to imageCompression.ts):
dataUrlToBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while(n--) u8arr[n] = bstr.charCodeAt(n);
  return new Blob([u8arr], {type: mime});
}
```

### Fix 3: ImageCropEditor - Handle External URLs with CORS

When editing an existing image from Supabase storage (external URL), the image may not load due to CORS. Need to handle this case.

**File:** `src/components/ui/ImageCropEditor.tsx`

Changes:
- Add `crossOrigin="anonymous"` to the img element to allow loading external images
- This enables the canvas to read pixel data from the image

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/ui/ImageCropEditor.tsx` | Add initial completedCrop on image load; add crossOrigin attribute; handle edge cases |
| `src/lib/imageCompression.ts` | Add `dataUrlToBlob` helper function |
| `src/components/profile/avatar/useAvatarUpload.tsx` | Use dataUrlToBlob instead of fetch for data URL conversion |
| `src/components/profile/banner/useBannerUpload.tsx` | Use dataUrlToBlob instead of fetch for data URL conversion |
| `src/components/profile/CreatePostBar.tsx` | Use dataUrlToBlob for consistency |
| `src/components/publications/EditPublicationModal.tsx` | Use dataUrlToBlob for consistency |

---

## Expected Outcome

After these changes:
1. The "Apply" button in the image editor will work immediately, even without adjusting the crop
2. Avatar and banner uploads will complete successfully without "Failed to fetch" errors
3. Editing existing images from storage will work correctly
