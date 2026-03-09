import { useState } from "react";
import { useClickOutside } from "@mantine/hooks";
import { Toolbar, ToolbarButton } from "~/components/ui/toolbar";
import { cn } from "~/utils/misc";
import { useTextureSprites } from "~/components/use-lgr-assets";
import { standardSprites } from "~/components/standard-sprites";
import { PictureIcon } from "~/components/sprite-icon";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { IconButton } from "~/components/ui/button";
import { useEditor, useEditorActions } from "../use-editor-store";

export function LevelPropertiesControl() {
  const [open, setOpen] = useState(false);
  const rootRef = useClickOutside(() => setOpen(false));
  const { setGround, setSky } = useEditorActions();

  const textureSprites = useTextureSprites();
  const allTextures = Array.from(
    new Set(standardSprites.textures.map(({ texture }) => texture)),
  );

  const groundTexture = useEditor((state) => state.ground);
  const skyTexture = useEditor((state) => state.sky);
  const groundTextureSprite = textureSprites.find(
    ({ texture }) => texture.texture === groundTexture,
  );
  const skyTextureSprite = textureSprites.find(
    ({ texture }) => texture.texture === skyTexture,
  );

  const handleSkyTextureSelect = (nextSky: string) => {
    const previousSky = skyTexture;
    const previousGround = groundTexture;
    if (nextSky === previousSky) return;

    if (nextSky === previousGround) {
      setGround(previousSky);
    }
    setSky(nextSky);
  };

  const handleGroundTextureSelect = (nextGround: string) => {
    const previousSky = skyTexture;
    const previousGround = groundTexture;
    if (nextGround === previousGround) return;

    if (nextGround === previousSky) {
      setSky(previousGround);
    }
    setGround(nextGround);
  };

  return (
    <div ref={rootRef} className="relative">
      <Tooltip>
        <TooltipTrigger>
          <ToolbarButton
            aria-label="Level properties"
            aria-expanded={open}
            onClick={() => setOpen((isOpen) => !isOpen)}
          >
            <LevelTextureIcon
              skySrc={skyTextureSprite?.maskedSrc ?? skyTextureSprite?.src}
              groundSrc={
                groundTextureSprite?.maskedSrc ?? groundTextureSprite?.src
              }
            />
          </ToolbarButton>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          Level properties
        </TooltipContent>
      </Tooltip>
      {open && (
        <div className="fixed top-20 left-20 flex items-center justify-center pointer-events-none">
          <Toolbar
            orientation="vertical"
            className="pl-4 gap-2 pointer-events-auto flex-col items-stretch"
          >
            <TexturePickerRow
              label="Sky"
              selectedTexture={skyTexture}
              textures={allTextures}
              textureSprites={textureSprites}
              onSelect={handleSkyTextureSelect}
              tooltipSide="top"
            />
            <TexturePickerRow
              label="Ground"
              selectedTexture={groundTexture}
              textures={allTextures}
              textureSprites={textureSprites}
              onSelect={handleGroundTextureSelect}
            />
          </Toolbar>
        </div>
      )}
    </div>
  );
}

function LevelTextureIcon({
  skySrc,
  groundSrc,
}: {
  skySrc?: string;
  groundSrc?: string;
}) {
  return (
    <span className="relative h-6 w-6 overflow-hidden rounded-sm bg-screen">
      <PictureIcon
        className="absolute inset-0 h-full w-full bg-no-repeat bg-center bg-cover"
        src={skySrc}
        style={{ clipPath: "polygon(0 0, 100% 0, 0 100%)" }}
      />
      <PictureIcon
        className="absolute inset-0 h-full w-full bg-no-repeat bg-center bg-cover"
        src={groundSrc}
        style={{ clipPath: "polygon(100% 0, 100% 100%, 0 100%)" }}
      />
    </span>
  );
}

type TexturePickerRowProps = {
  label: string;
  selectedTexture: string;
  textures: string[];
  textureSprites: ReturnType<typeof useTextureSprites>;
  onSelect: (texture: string) => void;
  tooltipSide?: "top" | "bottom";
};

function TexturePickerRow({
  label,
  selectedTexture,
  textures,
  textureSprites,
  onSelect,
  tooltipSide = "bottom",
}: TexturePickerRowProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-12 text-xs self-center font-semibold">{label}</div>
      <div className="flex flex-wrap gap-2">
        {textures.map((textureName) => {
          const textureSprite = textureSprites.find(
            ({ texture }) => texture.texture === textureName,
          );
          const selected = selectedTexture === textureName;
          return (
            <Tooltip key={textureName}>
              <TooltipTrigger>
                <IconButton
                  type="button"
                  aria-label={`${label}: ${textureName}`}
                  onClick={() => onSelect(textureName)}
                  className={cn("overflow-clip p-0 hover:opacity-90", {
                    "border border-accent": selected,
                  })}
                >
                  <PictureIcon
                    className="h-full w-full bg-cover bg-center"
                    src={textureSprite?.maskedSrc ?? textureSprite?.src}
                  />
                </IconButton>
              </TooltipTrigger>
              <TooltipContent side={tooltipSide} className="text-xs">
                {textureName}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}
