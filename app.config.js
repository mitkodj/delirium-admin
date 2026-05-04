const devConfig = require("./src/utils/config/app-config.js");
const prodConfig = require("./src/utils/config/app-config-release.js");

const isProd = process.env.PROD_BUILD === "true";

const appConfig = isProd ? prodConfig : devConfig;

export default {
  expo: {
    name: "Delirium Admin",
    slug: "delirium-admin",

    scheme: "com.radmit.deliriumadmin",

    ios: {
      bundleIdentifier: "com.radmit.deliriumadmin",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        UIViewControllerBasedStatusBarAppearance: true,
      },
    },

    android: {
      package: "com.delirium.admin",
    },

    extra: {
      ...appConfig,
      eas: {
        projectId: "63ab7997-c47e-420a-a9c2-3b7ea4c36cf9",
      },
    },
    plugins: ["expo-font"],
  },
};
