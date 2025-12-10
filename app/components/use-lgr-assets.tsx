import { useEffect, useContext, createContext, useMemo, useState } from "react";
import { LgrAssets } from "./lgr-assets";

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
    [lgrLoader]
  );

  return (
    <LgrContext.Provider value={{ lgr: lgrLoader, isLoaded }}>
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

function bitmapToDataUrl(bmp: ImageBitmap | null) {
  if (typeof document === "undefined" || !bmp) return undefined;
  const canvas = document.createElement("canvas");
  canvas.width = bmp.width;
  canvas.height = bmp.height;
  const ctx = canvas.getContext("2d");
  ctx?.drawImage(bmp, 0, 0);
  return canvas.toDataURL();
}
