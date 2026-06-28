const groundTileModules = import.meta.glob("../assets/ground-tiles/*.png", {
  eager: true,
  import: "default",
});

export const GROUND_TILE_TEXTURE_KEY = "gtp_1";
export const GROUND_TILE_TEXTURE_URL =
  groundTileModules["../assets/ground-tiles/gt_1.png"];
