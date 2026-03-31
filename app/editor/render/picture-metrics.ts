import type { LgrAssets } from "~/components/lgr-assets";
import { ELMA_PIXEL_SCALE } from "~/editor/constants";

export const PICTURE_SCALE = ELMA_PIXEL_SCALE;

export function getBitmapWorldDimensions(bitmap: ImageBitmap) {
  return {
    width: bitmap.width * PICTURE_SCALE,
    height: bitmap.height * PICTURE_SCALE,
  };
}

export function getPictureWorldDimensions(
  picture: {
    name?: string;
    texture?: string;
    mask?: string;
  },
  lgrAssets: LgrAssets | null,
) {
  if (!lgrAssets) return null;

  if (picture.texture && picture.mask) {
    const maskSprite = lgrAssets.getSprite(picture.mask);
    if (!maskSprite) return null;
    return getBitmapWorldDimensions(maskSprite);
  }

  const sprite = picture.name ? lgrAssets.getSprite(picture.name) : null;
  if (!sprite) return null;
  return getBitmapWorldDimensions(sprite);
}
