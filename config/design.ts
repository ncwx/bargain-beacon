export type ThemeName =
  | "blush"
  | "minimal";

export type InterfaceCasing =
  | "sentence"
  | "lowercase";

export type FontName =
  | "geist"
  | "system";

export type RadiusStyle =
  | "soft"
  | "compact";

export type DesignConfig = {
  theme: ThemeName;
  casing: InterfaceCasing;
  font: FontName;
  radius: RadiusStyle;
};

export const design: DesignConfig = {
  /*
   * colour palette:
   * "blush"   = current Bargain Beacon pink
   * "minimal" = neutral black, white and grey
   */
  theme: "blush",

  /*
   * interface wording:
   * "sentence"  = Best value today
   * "lowercase" = best value today
   *
   * this will not affect product names, brands
   * or retailer names
   */
  casing: "sentence",

  /*
   * main application font:
   * "geist"  = current Next.js font
   * "system" = operating-system font
   */
  font: "geist",

  /*
   * corners:
   * "soft"    = current rounded appearance
   * "compact" = slightly sharper appearance
   */
  radius: "soft",
};

/*
 * use this only for interface wording
 * never pass product names, brands or retailer names into it
 */
export function formatInterfaceText(
  text: string,
): string {
  return design.casing === "lowercase"
    ? text.toLocaleLowerCase("en-GB")
    : text;
}