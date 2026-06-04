module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        "babel-preset-expo",
        {
          jsxImportSource: "nativewind",
          // Strip/transform `import.meta.*` so the web bundle doesn't crash
          // with "Cannot use 'import.meta' outside a module". zustand and a
          // few other ESM deps reference `import.meta.env`; native handles
          // this automatically, but Metro's web output is a classic script.
          unstable_transformImportMeta: true,
        },
      ],
      "nativewind/babel",
    ],
  };
};
