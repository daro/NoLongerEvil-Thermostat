const { notarize } = require('@electron/notarize');
const path = require('path');
const fs = require('fs');
const os = require('os');

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;

  if (electronPlatformName !== 'darwin') {
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(appOutDir, `${appName}.app`);

  if (!fs.existsSync(appPath)) {
    throw new Error(`Cannot find application at: ${appPath}`);
  }

  const appleApiKeyId = process.env.APPLE_API_KEY_ID;
  const appleApiIssuer = process.env.APPLE_API_ISSUER;

  if (!appleApiKeyId || !appleApiIssuer) {
    console.warn('Skipping notarization: Missing Apple API credentials');
    console.warn('Required: APPLE_API_KEY_ID, APPLE_API_ISSUER');
    return;
  }

  // Use the API key file that was created by the workflow
  const homeDir = os.homedir();
  const appleApiKeyPath = path.join(homeDir, 'private_keys', `AuthKey_${appleApiKeyId}.p8`);

  if (!fs.existsSync(appleApiKeyPath)) {
    throw new Error(`API key file not found at: ${appleApiKeyPath}`);
  }

  console.log(`Notarizing ${appPath}...`);
  console.log(`Using API key: ${appleApiKeyPath}`);
  console.log(`Using issuer: ${appleApiIssuer}`);

  try {
    await notarize({
      appPath: appPath,
      appleApiKey: appleApiKeyPath,
      appleApiIssuer: appleApiIssuer,
    });
    console.log('Notarization complete!');
  } catch (error) {
    console.error('Notarization failed:', error);

    // Write error to log file for debugging
    const errorLogPath = path.join(context.packager.projectDir, 'notarization-error.log');
    fs.writeFileSync(errorLogPath, `Notarization Error:\n${error.message}\n${error.stack || ''}\n`);

    throw error;
  }
};
