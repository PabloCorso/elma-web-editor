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

type LevelPropertiesControlProps = {
  skyTexture: string;
  groundTexture: string;
  onSkyTextureSelect: (texture: string) => void;
  onGroundTextureSelect: (texture: string) => void;
};

export function LevelPropertiesControl({
  skyTexture,
  groundTexture,
  onSkyTextureSelect,
  onGroundTextureSelect,
}: LevelPropertiesControlProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useClickOutside(() => setOpen(false));

  const textureSprites = useTextureSprites();
  const allTextures = Array.from(
    new Set(standardSprites.textures.map(({ texture }) => texture)),
  );
  const groundTextureSprite = textureSprites.find(
    ({ texture }) => texture.texture === groundTexture,
  );
  const skyTextureSprite = textureSprites.find(
    ({ texture }) => texture.texture === skyTexture,
  );

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
              onSelect={onSkyTextureSelect}
              tooltipSide="top"
            />
            <TexturePickerRow
              label="Ground"
              selectedTexture={groundTexture}
              textures={allTextures}
              textureSprites={textureSprites}
              onSelect={onGroundTextureSelect}
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
