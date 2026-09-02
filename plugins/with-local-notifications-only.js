const { withEntitlementsPlist, withInfoPlist } = require('expo/config-plugins');

/**
 * FormaVita only schedules local notifications. The expo-notifications plugin
 * adds the APNs entitlement, which cannot be signed by a free Apple team.
 */
module.exports = function withLocalNotificationsOnly(config) {
  config = withEntitlementsPlist(config, (configWithEntitlements) => {
    delete configWithEntitlements.modResults['aps-environment'];
    return configWithEntitlements;
  });

  return withInfoPlist(config, (configWithInfoPlist) => {
    const backgroundModes = configWithInfoPlist.modResults.UIBackgroundModes;

    if (Array.isArray(backgroundModes)) {
      const localOnlyModes = backgroundModes.filter(
        (mode) => mode !== 'remote-notification'
      );

      if (localOnlyModes.length > 0) {
        configWithInfoPlist.modResults.UIBackgroundModes = localOnlyModes;
      } else {
        delete configWithInfoPlist.modResults.UIBackgroundModes;
      }
    }

    return configWithInfoPlist;
  });
};
