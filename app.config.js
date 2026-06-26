const devConfig = require("./src/utils/config/app-config.js");
const prodConfig = require("./src/utils/config/app-config-release.js");

const isProd = process.env.PROD_BUILD === "true";

const appConfig = isProd ? prodConfig : devConfig;

export default {
  expo: {
    name: "Delirium Admin",
    slug: "delirium-admin",

    scheme: "com.radmit.deliriumadmin",

    icon: "./logo-ios.png",
    orientation: "default",

    ios: {
      bundleIdentifier: "com.radmit.deliriumadmin",
      icon: "./logo-ios.png",
      supportsTablet: true,
      requireFullScreen: true,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        UIViewControllerBasedStatusBarAppearance: true,
        UIRequiresFullScreen: true,
      },
    },

    android: {
      package: "com.delirium.admin",
    },

    extra: {
      ...appConfig,
      eas: {
        projectId: "cbeca8df-42bd-476e-aaa2-6e6c639a06ad",
      },
    },
    plugins: ["expo-font", "./plugins/withIpadSupport"],
  },
};
