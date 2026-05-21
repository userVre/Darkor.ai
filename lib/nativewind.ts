try {
  const { cssInterop } = require("nativewind");

  const applyInterop = (moduleName: string, exportName: string) => {
    try {
      const Component = require(moduleName)?.[exportName];
      if (Component) {
        cssInterop(Component, { className: "style" });
      }
    } catch {
      // Optional native modules should not block the rest of the interop setup.
    }
  };

  applyInterop("moti", "MotiView");
  applyInterop("moti", "MotiImage");
  applyInterop("expo-blur", "BlurView");
  applyInterop("expo-image", "Image");
} catch (error) {
  console.warn("[Boot] NativeWind interop failed", error);
}
