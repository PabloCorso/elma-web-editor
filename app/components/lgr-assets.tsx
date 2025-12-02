import * as elmajs from "elmajs";
import defaultLgr from "../assets/lgr/Default.lgr?url";
import { decodeLgrPictureBitmap } from "~/editor/utils/pcx-loader";

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

  isReady() {
    return !!this.lgr;
  }
}
