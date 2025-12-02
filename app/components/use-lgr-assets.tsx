import { useEffect, useContext, createContext, useMemo } from "react";
import { LgrAssets } from "./lgr-assets";

const LgrContext = createContext<LgrAssets | null>(null);

export function LgrAssetsProvider({ children }: { children: React.ReactNode }) {
  const lgrLoader = useMemo(() => new LgrAssets(), []);

  useEffect(
    function kickOffLgrLoading() {
      lgrLoader.load();
    },
    [lgrLoader]
  );

  return (
    <LgrContext.Provider value={lgrLoader}>{children}</LgrContext.Provider>
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
  const sprite = lgrAssets.getSprite(name);
  return useMemo(() => bitmapToDataUrl(sprite), [sprite]);
}

function bitmapToDataUrl(bmp: ImageBitmap | null) {
  if (typeof document === "undefined" || !bmp) return null;
  const canvas = document.createElement("canvas");
  canvas.width = bmp.width;
  canvas.height = bmp.height;
  const ctx = canvas.getContext("2d");
  ctx?.drawImage(bmp, 0, 0);
  return canvas.toDataURL();
}
