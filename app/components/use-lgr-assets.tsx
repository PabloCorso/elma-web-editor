import { useEffect, useContext, createContext, useMemo, useState } from "react";
import { LgrAssets } from "./lgr-assets";
import { standardSprites } from "./standard-sprites";

type LgrContextType = { lgr: LgrAssets | null; isLoaded: boolean };

const LgrContext = createContext<LgrContextType | null>(null);

export function LgrAssetsProvider({ children }: { children: React.ReactNode }) {
  const lgrLoader = useMemo(() => new LgrAssets(), []);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(
    function kickOffLgrLoading() {
      lgrLoader.load().then(() => {
        setIsLoaded(true);
      });
    },
    [lgrLoader],
  );

  const value = useMemo(
    () => ({ lgr: lgrLoader, isLoaded }),
    [lgrLoader, isLoaded],
  );

  return (
    <LgrContext.Provider value={value}>
      {children}
    </LgrContext.Provider>
  );
}

export function useLgrAssets() {
  const context = useContext(LgrContext);
  if (!context) {
    throw new Error("useLgrAssets must be used within LgrAssetsProvider");
  }

  return context;
}

export function useLgrSprite(name: string) {
  const lgrAssets = useLgrAssets();
  const sprite = lgrAssets.lgr?.getSprite(name) || null;
  return useMemo(
    () => ({
      src: bitmapToDataUrl(sprite),
      width: sprite?.width,
      height: sprite?.height,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sprite, lgrAssets.isLoaded]
  );
}

export function usePictureSprites() {
  const lgrAssets = useLgrAssets();
  const pictureSprites = lgrAssets.lgr?.getPictureSprites() || [];
  return useMemo(
    () =>
      pictureSprites.map(({ picture, sprite }) => ({
        picture,
        src: bitmapToDataUrl(sprite),
        width: sprite?.width,
        height: sprite?.height,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lgrAssets.isLoaded]
  );
}

export function useTextureSprites() {
  const lgrAssets = useLgrAssets();
  const textureSprites = lgrAssets.lgr?.getTextureSprites() || [];
  return useMemo(
    () =>
      textureSprites.map(({ texture, sprite }) => {
        const maskSprite = lgrAssets.lgr?.getSprite(texture.mask) || null;
        return {
          texture,
          src: bitmapToDataUrl(sprite),
          maskedSrc: bitmapMaskToDataUrl(sprite, maskSprite),
          width: sprite?.width,
          height: sprite?.height,
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lgrAssets.isLoaded]
  );
}

export function useTextureMaskSprites() {
  const lgrAssets = useLgrAssets();
  const textureSprites = lgrAssets.lgr?.getTextureSprites() || [];
  return useMemo(
    () =>
      standardSprites.textureMasks.flatMap((mask) =>
        textureSprites.map(({ texture, sprite }) => {
          const maskSprite = lgrAssets.lgr?.getSprite(mask) || null;
          return {
            texture,
            mask,
            src: bitmapToDataUrl(sprite),
            maskedSrc: bitmapMaskToDataUrl(sprite, maskSprite),
            width: sprite?.width,
            height: sprite?.height,
          };
        }),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lgrAssets.isLoaded]
  );
}

export function bitmapToDataUrl(bmp: ImageBitmap | null) {
  if (typeof document === "undefined" || !bmp) return undefined;
  const canvas = document.createElement("canvas");
  canvas.width = bmp.width;
  canvas.height = bmp.height;
  const ctx = canvas.getContext("2d");
  if (ctx) ctx.imageSmoothingEnabled = false;
  ctx?.drawImage(bmp, 0, 0);
  return canvas.toDataURL();
}

export function bitmapMaskToDataUrl(
  textureBmp: ImageBitmap | null,
  maskBmp: ImageBitmap | null
) {
  if (typeof document === "undefined" || !textureBmp || !maskBmp) return undefined;
  const canvas = document.createElement("canvas");
  canvas.width = maskBmp.width;
  canvas.height = maskBmp.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return undefined;
  ctx.imageSmoothingEnabled = false;

  const pattern = ctx.createPattern(textureBmp, "repeat");
  if (!pattern) return undefined;
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = "destination-in";
  const binaryMaskCanvas = createBinaryMaskCanvas(maskBmp);
  ctx.drawImage(binaryMaskCanvas, 0, 0);
  return canvas.toDataURL();
}

function createBinaryMaskCanvas(maskBmp: ImageBitmap) {
  const canvas = document.createElement("canvas");
  canvas.width = maskBmp.width;
  canvas.height = maskBmp.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return canvas;

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(maskBmp, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    data[i + 3] = data[i + 3] > 0 ? 255 : 0;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}
