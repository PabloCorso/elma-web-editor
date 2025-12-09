import * as elmajs from "elmajs";
import defaultLgr from "../assets/lgr/Default.lgr?url";
import { decodeLgrPictureBitmap } from "~/editor/utils/pcx-loader";
import type { AppleAnimation } from "~/editor/editor.types";

export class LgrAssets {
  private lgr: elmajs.LGR | null = null;
  private lgrSprites: Record<string, ImageBitmap> = {};

  async load() {
    const buf = await fetch(defaultLgr).then((r) => r.arrayBuffer());
    this.lgr = elmajs.LGR.from(new Uint8Array(buf));
    await this.loadAllSprites(); // or skip for lazy loading
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
      const bmp = await decodeLgrPictureBitmap(picture);
      if (bmp) this.lgrSprites[name] = bmp;
    }
  }

  getSprites() {
    return this.lgrSprites;
  }

  getSprite(name: string) {
    const normName = this.normalizeName(name);
    return this.lgrSprites[normName] || null;
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

  isReady() {
    return !!this.lgr;
  }
}
