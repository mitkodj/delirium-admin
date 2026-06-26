const { withXcodeProject } = require('@expo/config-plugins');

module.exports = function withIpadSupport(config) {
    return withXcodeProject(config, (config) => {
        const xcodeProject = config.modResults;
        const configurations = xcodeProject.pbxXCBuildConfigurationSection();
        let changed = 0;
        for (const key of Object.keys(configurations)) {
            if (key.endsWith('_comment')) continue;
            const buildConfig = configurations[key];
            if (buildConfig && buildConfig.buildSettings && typeof buildConfig.buildSettings.PRODUCT_NAME !== 'undefined') {
                buildConfig.buildSettings.TARGETED_DEVICE_FAMILY = '"1,2"';
                changed++;
            }
        }
        console.log(`[withIpadSupport] set TARGETED_DEVICE_FAMILY="1,2" on ${changed} configurations`);
        return config;
    });
};
