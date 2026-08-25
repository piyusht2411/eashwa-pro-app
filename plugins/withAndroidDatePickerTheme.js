/**
 * Custom Expo config plugin to set Android colorPrimary to the brand orange (#F97316).
 * This makes the DateTimePicker calendar header (and other system UI) use the orange color.
 *
 * Applied via app.json plugins: ["./plugins/withAndroidDatePickerTheme"]
 */

const { withAndroidStyles } = require("@expo/config-plugins");

/**
 * @param {import('@expo/config-plugins').ExpoConfig} config
 */
module.exports = function withAndroidDatePickerTheme(config) {
  return withAndroidStyles(config, (modConfig) => {
    const styles = modConfig.modResults;

    // Find or create the AppTheme style
    const appThemeStyle = styles.resources.style?.find(
      (s) => s.$.name === "AppTheme"
    );

    const orangePrimary = "#F97316";
    const orangePrimaryDark = "#EA580C";

    const colorItems = [
      { $: { name: "colorPrimary" }, _: orangePrimary },
      { $: { name: "colorPrimaryDark" }, _: orangePrimaryDark },
      { $: { name: "colorAccent" }, _: orangePrimary },
      // Android 12+ Material 3 tokens
      { $: { name: "colorPrimaryVariant" }, _: orangePrimaryDark },
    ];

    if (appThemeStyle) {
      // Merge / update existing items
      colorItems.forEach((newItem) => {
        const existing = appThemeStyle.item?.find(
          (i) => i.$.name === newItem.$.name
        );
        if (existing) {
          existing._ = newItem._;
        } else {
          appThemeStyle.item = appThemeStyle.item ?? [];
          appThemeStyle.item.push(newItem);
        }
      });
    } else {
      // Create AppTheme style if missing
      styles.resources.style = styles.resources.style ?? [];
      styles.resources.style.push({
        $: { name: "AppTheme", parent: "Theme.AppCompat.Light.NoActionBar" },
        item: colorItems,
      });
    }

    return modConfig;
  });
};
