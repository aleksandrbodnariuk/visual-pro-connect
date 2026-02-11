
import { useState, useRef, useCallback } from 'react';
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { RotateCcw, ZoomIn, Check, X } from 'lucide-react';

interface ImageCropEditorProps {
  imageSrc: string;
  open: boolean;
  onClose: () => void;
  onCropComplete: (croppedImage: string) => void;
  aspectRatio?: number | undefined; // undefined = free crop, 1 = square, 3.2 = banner
  title?: string;
  circularCrop?: boolean;
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number,
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  );
}

export function ImageCropEditor({
  imageSrc,
  open,
  onClose,
  onCropComplete,
  aspectRatio,
  title = 'Редагувати зображення',
  circularCrop = false
}: ImageCropEditorProps) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [scale, setScale] = useState(1);
  const [rotate, setRotate] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    if (aspectRatio) {
      const initialCrop = centerAspectCrop(width, height, aspectRatio);
      setCrop(initialCrop);
      if (initialCrop) {
        const pixelCrop: PixelCrop = {
          unit: 'px',
          x: Math.round((initialCrop.x / 100) * width),
          y: Math.round((initialCrop.y / 100) * height),
          width: Math.round((initialCrop.width / 100) * width),
          height: Math.round((initialCrop.height / 100) * height),
        };
        setCompletedCrop(pixelCrop);
      }
    } else {
      // Free crop: select full image by default
      const fullCrop: Crop = { unit: '%', x: 0, y: 0, width: 100, height: 100 };
      setCrop(fullCrop);
      setCompletedCrop({ unit: 'px', x: 0, y: 0, width, height });
    }
  }, [aspectRatio]);

  const handleComplete = useCallback(async () => {
    if (!crop || !imgRef.current) {
      return;
    }

    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return;
    }

    const natW = image.naturalWidth;
    const natH = image.naturalHeight;

    // Use percent crop directly to avoid displayed-size rounding errors
    const cropX = crop.unit === '%' ? (crop.x / 100) * natW : crop.x * (natW / image.width);
    const cropY = crop.unit === '%' ? (crop.y / 100) * natH : crop.y * (natH / image.height);
    const cropW = crop.unit === '%' ? (crop.width / 100) * natW : crop.width * (natW / image.width);
    const cropH = crop.unit === '%' ? (crop.height / 100) * natH : crop.height * (natH / image.height);

    const outW = Math.round(cropW);
    const outH = Math.round(cropH);

    canvas.width = outW;
    canvas.height = outH;
    ctx.imageSmoothingQuality = 'high';

    if (rotate === 0 && scale === 1) {
      // Simple crop: direct drawImage (most reliable)
      ctx.drawImage(image, cropX, cropY, cropW, cropH, 0, 0, outW, outH);
    } else {
      // Rotation/zoom: use transforms
      const centerX = natW / 2;
      const centerY = natH / 2;

      ctx.save();
      ctx.translate(-cropX, -cropY);
      ctx.translate(centerX, centerY);
      ctx.rotate((rotate * Math.PI) / 180);
      ctx.scale(scale, scale);
      ctx.translate(-centerX, -centerY);
      ctx.drawImage(image, 0, 0);
      ctx.restore();
    }

    const croppedImageUrl = canvas.toDataURL('image/jpeg', 0.92);
    onCropComplete(croppedImageUrl);
    onClose();
  }, [crop, scale, rotate, onCropComplete, onClose]);

  const handleReset = () => {
    setScale(1);
    setRotate(0);
    if (imgRef.current) {
      const { width, height } = imgRef.current;
      if (aspectRatio) {
        setCrop(centerAspectCrop(width, height, aspectRatio));
      } else {
        setCrop({ unit: '%', x: 0, y: 0, width: 100, height: 100 });
        setCompletedCrop({ unit: 'px', x: 0, y: 0, width, height });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-4">
          {/* Crop Area */}
          <div className="relative max-h-[400px] overflow-hidden rounded-lg bg-muted flex items-center justify-center">
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={aspectRatio}
              circularCrop={circularCrop}
              className="max-h-[400px]"
            >
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Редагування"
                crossOrigin="anonymous"
                style={{
                  transform: `scale(${scale}) rotate(${rotate}deg)`,
                  maxHeight: '400px',
                  width: 'auto'
                }}
                onLoad={onImageLoad}
              />
            </ReactCrop>
          </div>

          {/* Controls */}
          <div className="w-full space-y-4 px-4">
            {/* Zoom Control */}
            <div className="flex items-center gap-4">
              <ZoomIn className="h-4 w-4 text-muted-foreground" />
              <Slider
                value={[scale]}
                min={0.5}
                max={3}
                step={0.1}
                onValueChange={([value]) => setScale(value)}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground w-12 text-right">
                {Math.round(scale * 100)}%
              </span>
            </div>

            {/* Rotate Control */}
            <div className="flex items-center gap-4">
              <RotateCcw className="h-4 w-4 text-muted-foreground" />
              <Slider
                value={[rotate]}
                min={-180}
                max={180}
                step={1}
                onValueChange={([value]) => setRotate(value)}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground w-12 text-right">
                {rotate}°
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Скинути
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose} className="gap-2">
              <X className="h-4 w-4" />
              Скасувати
            </Button>
            <Button onClick={handleComplete} className="gap-2">
              <Check className="h-4 w-4" />
              Застосувати
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
