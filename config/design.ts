export const selectableThemeNames = [
  "blush",
  "ocean",
  "berry",
  "forest"
] as const;

export type SelectableThemeName =
  (typeof selectableThemeNames)[number];

export type ThemeName =
  | SelectableThemeName
  | "minimal";

export type InterfaceCasing =
  | "sentence"
  | "lowercase";

export type RadiusStyle =
  | "soft"
  | "compact";

export type DesignConfig = {
  theme: ThemeName;
  casing: InterfaceCasing;
  radius: RadiusStyle;
};

export const THEME_COOKIE_NAME =
  "bargain-beacon-theme";

export const design: DesignConfig = {
  /*
   * default colour palette:
   * users without a saved preference
   * will always receive Blush
   */
  theme: "blush",

  /*
   * interface wording:
   * "sentence"  = Best value today
   * "lowercase" = best value today
   *
   * this does not affect product names,
   * brands or retailer names
   */
  casing: "sentence",

  /*
   * corners:
   * "soft"    = current rounded appearance
   * "compact" = slightly sharper appearance
   */
  radius: "soft",
};

export function isSelectableThemeName(
  value: unknown,
): value is SelectableThemeName {
  return (
    typeof value === "string" &&
    selectableThemeNames.includes(
      value as SelectableThemeName,
    )
  );
}

/*
 * use this only for interface wording
 * never pass product names, brands or
 * retailer names into it
 */
export function formatInterfaceText(
  text: string,
): string {
  return design.casing === "lowercase"
    ? text.toLocaleLowerCase("en-GB")
    : text;
}