import defaultLgr from "../assets/lgr/Default.lgr?url";
import { decodeLgrSprite } from "~/editor/helpers/pcx-loader";
import { ElmaLGR, type AppleAnimation } from "~/editor/elma-types";
import { standardSprites } from "./standard-sprites";

export class LgrAssets {
  private lgr: InstanceType<typeof ElmaLGR> | null = null;
  private lgrSprites: Record<string, ImageBitmap> = {};

  async load() {
    const buf = await fetch(defaultLgr).then((r) => r.arrayBuffer());
    this.lgr = ElmaLGR.from(new Uint8Array(buf));
    await this.loadAllSprites();
  }

  private normalizeName(name: string) {
    return name
      .trim()
      .toLowerCase()
      .replace(/\.pcx$/, "");
  }

  private async loadAllSprites() {
    if (!this.lgr) return;

    for (const picture of this.lgr.pictureData) {
      const name = this.normalizeName(picture.name);
      if (this.lgrSprites[name]) continue;

      const sprite = await decodeLgrSprite(picture);
      if (sprite) {
        this.lgrSprites[name] = sprite;
      }
    }
  }

  getSprites() {
    return this.lgrSprites;
  }

  getSprite(name: string) {
    const normName = this.normalizeName(name);
    return this.lgrSprites[normName] || null;
  }

  getKuskiSprites() {
    const kuskiSprites: Record<string, ImageBitmap> = {};
    for (const partName of standardSprites.kuski) {
      const sprite = this.getSprite(partName);
      if (sprite) {
        kuskiSprites[partName] = sprite;
      }
    }
    return kuskiSprites;
  }

  getAppleSprite(animation: AppleAnimation) {
    const apple1Sprite = this.lgrSprites["qfood1"];
    const apple2Sprite = this.lgrSprites["qfood2"];
    return animation > 1 ? apple2Sprite : apple1Sprite;
  }

  getKillerSprite() {
    return this.getSprite("qkiller");
  }

  getFlowerSprite() {
    return this.getSprite("qexit");
  }

  getPictureSprites() {
    return standardSprites.pictures.map((picture) => ({
      picture,
      sprite: this.getSprite(picture.name),
    }));
  }

  isReady() {
    return !!this.lgr;
  }
}
