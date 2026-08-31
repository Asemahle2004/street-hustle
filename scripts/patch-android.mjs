import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ANDROID = join(ROOT, 'android');
const APP_ID = 'com.asemahle2004.streethustle';
const VERSION_NAME = process.env.VERSION_NAME || '0.10.0';
const VERSION_CODE = Number(process.env.VERSION_CODE || '10');

async function exists(path) {
  try { await access(path); return true; } catch { return false; }
}

async function patchVariables() {
  const path = join(ANDROID, 'variables.gradle');
  let text = await readFile(path, 'utf8');
  const set = (name, value) => {
    const regex = new RegExp(`${name}\\s*=\\s*\\d+`);
    if (regex.test(text)) text = text.replace(regex, `${name} = ${value}`);
    else console.warn(`Could not find ${name} in variables.gradle; Capacitor defaults will be used.`);
  };
  set('minSdkVersion', 24);
  set('compileSdkVersion', 36);
  set('targetSdkVersion', 36);
  await writeFile(path, text);
}

async function patchBuildGradle() {
  const path = join(ANDROID, 'app', 'build.gradle');
  let text = await readFile(path, 'utf8');
  text = text.replace(/versionCode\s+\d+/, `versionCode ${VERSION_CODE}`);
  text = text.replace(/versionName\s+['"][^'"]+['"]/, `versionName "${VERSION_NAME}"`);

  if (!text.includes('STREET_HUSTLE_SIGNING')) {
    const signingBlock = `// STREET_HUSTLE_SIGNING\ndef streetHustleKeystorePath = System.getenv("ANDROID_KEYSTORE_PATH")\ndef streetHustleHasSigning = streetHustleKeystorePath != null && !streetHustleKeystorePath.isBlank()\n\nandroid {\n    signingConfigs {\n        streetHustleRelease {\n            if (streetHustleHasSigning) {\n                storeFile file(streetHustleKeystorePath)\n                storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")\n                keyAlias System.getenv("ANDROID_KEY_ALIAS")\n                keyPassword System.getenv("ANDROID_KEY_PASSWORD")\n            }\n        }\n    }`;
    text = text.replace(/android\s*\{/, signingBlock);
    text = text.replace(
      /buildTypes\s*\{\s*release\s*\{/,
      `buildTypes {\n        release {\n            if (streetHustleHasSigning) {\n                signingConfig signingConfigs.streetHustleRelease\n            }`
    );
  }
  await writeFile(path, text);
}

async function patchManifest() {
  const path = join(ANDROID, 'app', 'src', 'main', 'AndroidManifest.xml');
  let text = await readFile(path, 'utf8');
  if (!text.includes('android:screenOrientation="landscape"')) {
    text = text.replace(
      /android:name="\.MainActivity"/,
      'android:name=".MainActivity"\n            android:screenOrientation="landscape"\n            android:resizeableActivity="true"'
    );
  }
  await writeFile(path, text);
}

async function writeImmersiveActivity() {
  const packageDir = join(ANDROID, 'app', 'src', 'main', 'java', ...APP_ID.split('.'));
  await mkdir(packageDir, { recursive: true });
  const path = join(packageDir, 'MainActivity.java');
  const source = `package ${APP_ID};

import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        hideSystemUI();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemUI();
    }

    private void hideSystemUI() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            getWindow().setDecorFitsSystemWindows(false);
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                controller.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            );
        }
    }
}
`;
  await writeFile(path, source);
}

async function patchColors() {
  const path = join(ANDROID, 'app', 'src', 'main', 'res', 'values', 'colors.xml');
  let text = await readFile(path, 'utf8');
  if (!text.includes('ic_launcher_background')) {
    text = text.replace('</resources>', '    <color name="ic_launcher_background">#172A39</color>\n</resources>');
  }
  await writeFile(path, text);
}

async function generateLauncherIcons() {
  const res = join(ANDROID, 'app', 'src', 'main', 'res');
  const icon = join(ROOT, 'mobile-assets', 'icon.png');
  const foreground = join(ROOT, 'mobile-assets', 'icon-foreground.png');
  const densities = {
    mdpi: [48, 108],
    hdpi: [72, 162],
    xhdpi: [96, 216],
    xxhdpi: [144, 324],
    xxxhdpi: [192, 432]
  };

  for (const [density, [legacySize, foregroundSize]] of Object.entries(densities)) {
    const dir = join(res, `mipmap-${density}`);
    await mkdir(dir, { recursive: true });
    await sharp(icon).resize(legacySize, legacySize).png().toFile(join(dir, 'ic_launcher.png'));
    await sharp(icon).resize(legacySize, legacySize).png().toFile(join(dir, 'ic_launcher_round.png'));
    await sharp(foreground).resize(foregroundSize, foregroundSize, { fit: 'contain' }).png().toFile(join(dir, 'ic_launcher_foreground.png'));
  }

  const adaptive = `<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n    <background android:drawable="@color/ic_launcher_background"/>\n    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n</adaptive-icon>\n`;
  const anydpi = join(res, 'mipmap-anydpi-v26');
  await mkdir(anydpi, { recursive: true });
  await writeFile(join(anydpi, 'ic_launcher.xml'), adaptive);
  await writeFile(join(anydpi, 'ic_launcher_round.xml'), adaptive);
}

async function refreshSplashImages() {
  const res = join(ANDROID, 'app', 'src', 'main', 'res');
  const source = join(ROOT, 'mobile-assets', 'splash.png');
  const dirs = await readdir(res, { withFileTypes: true });
  for (const dir of dirs) {
    if (!dir.isDirectory() || !dir.name.startsWith('drawable')) continue;
    const target = join(res, dir.name, 'splash.png');
    if (!(await exists(target))) continue;
    try {
      const meta = await sharp(target).metadata();
      const width = meta.width || 1200;
      const height = meta.height || 1200;
      const bytes = await sharp(source).resize(width, height, { fit: 'cover' }).png().toBuffer();
      await writeFile(target, bytes);
    } catch (error) {
      console.warn(`Splash replacement skipped for ${target}`, error.message);
    }
  }
}

await patchVariables();
await patchBuildGradle();
await patchManifest();
await writeImmersiveActivity();
await patchColors();
await generateLauncherIcons();
await refreshSplashImages();

console.log(`Android project patched: ${APP_ID} v${VERSION_NAME} (${VERSION_CODE}), target API 36.`);
