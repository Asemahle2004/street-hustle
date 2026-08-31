import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MOBILE = join(ROOT, 'mobile-assets');
const STORE = join(ROOT, 'store-assets');
await mkdir(MOBILE, { recursive: true });
await mkdir(STORE, { recursive: true });

const iconSvg = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#111923"/><stop offset="1" stop-color="#27445c"/>
    </linearGradient>
    <linearGradient id="road" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#282b2f"/><stop offset="1" stop-color="#0d0f11"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" rx="190" fill="url(#sky)"/>
  <circle cx="790" cy="214" r="92" fill="#f0b43a" opacity=".95"/>
  <path d="M0 612 L170 505 L315 555 L430 425 L590 540 L745 462 L1024 610 V730 H0Z" fill="#182b24"/>
  <path d="M355 1024 L467 550 H557 L678 1024Z" fill="url(#road)"/>
  <path d="M505 604 L520 604 L548 1024 H515Z" fill="#f3cb32"/>
  <g fill="#d9e0e6" opacity=".9">
    <rect x="95" y="544" width="150" height="115"/><rect x="749" y="535" width="176" height="125"/>
  </g>
  <g fill="#171a1d"><rect x="125" y="590" width="38" height="69"/><rect x="805" y="586" width="45" height="74"/></g>
  <text x="512" y="300" text-anchor="middle" font-family="DejaVu Sans,Arial,sans-serif" font-weight="900" font-size="132" letter-spacing="4" fill="#fff">STREET</text>
  <text x="512" y="425" text-anchor="middle" font-family="DejaVu Sans,Arial,sans-serif" font-weight="900" font-size="132" letter-spacing="4" fill="#f0b43a">HUSTLE</text>
  <text x="512" y="475" text-anchor="middle" font-family="DejaVu Sans,Arial,sans-serif" font-weight="700" font-size="32" letter-spacing="6" fill="#d6dee5">ZERO • HERO • ZERO • HERO</text>
</svg>`);

const foregroundSvg = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <path d="M330 850 L452 310 H570 L700 850Z" fill="#1b1e21"/>
  <path d="M505 365 H528 L560 850 H520Z" fill="#f2c42b"/>
  <text x="512" y="260" text-anchor="middle" font-family="DejaVu Sans,Arial,sans-serif" font-weight="900" font-size="164" fill="#ffffff">SH</text>
</svg>`);

const backgroundSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" fill="#172a39"/><circle cx="780" cy="210" r="105" fill="#e9a934"/></svg>`);

const featureSvg = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#101820"/><stop offset="1" stop-color="#325d76"/></linearGradient></defs>
  <rect width="1024" height="500" fill="url(#g)"/>
  <circle cx="860" cy="96" r="66" fill="#efb33c"/>
  <path d="M0 348 L120 270 L215 318 L315 232 L440 323 L560 260 L690 325 L800 245 L1024 335 V500 H0Z" fill="#173226"/>
  <path d="M600 500 L674 290 H737 L835 500Z" fill="#171a1d"/><path d="M704 320 H715 L743 500 H726Z" fill="#f1c631"/>
  <text x="64" y="158" font-family="DejaVu Sans,Arial,sans-serif" font-size="86" font-weight="900" fill="#fff">STREET</text>
  <text x="64" y="242" font-family="DejaVu Sans,Arial,sans-serif" font-size="86" font-weight="900" fill="#efb33c">HUSTLE</text>
  <text x="68" y="300" font-family="DejaVu Sans,Arial,sans-serif" font-size="29" font-weight="700" fill="#e2e8ed">BUILD A LIFE. FACE THE CONSEQUENCES. REBUILD.</text>
  <text x="68" y="350" font-family="DejaVu Sans,Arial,sans-serif" font-size="23" fill="#c7d2d9">A fictional South African 3D life-simulation adventure.</text>
</svg>`);

const splashSvg = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="2732" height="2732" viewBox="0 0 2732 2732">
  <rect width="2732" height="2732" fill="#111418"/>
  <circle cx="2140" cy="580" r="250" fill="#eeb13b"/>
  <path d="M810 2732 L1160 1330 H1510 L1910 2732Z" fill="#24282c"/>
  <path d="M1340 1460 H1395 L1485 2732 H1405Z" fill="#f1c52f"/>
  <text x="1366" y="1050" text-anchor="middle" font-family="DejaVu Sans,Arial,sans-serif" font-weight="900" font-size="280" fill="#ffffff">STREET</text>
  <text x="1366" y="1320" text-anchor="middle" font-family="DejaVu Sans,Arial,sans-serif" font-weight="900" font-size="280" fill="#eeb13b">HUSTLE</text>
</svg>`);

await sharp(iconSvg).png().toFile(join(MOBILE, 'icon.png'));
await sharp(foregroundSvg).png().toFile(join(MOBILE, 'icon-foreground.png'));
await sharp(backgroundSvg).png().toFile(join(MOBILE, 'icon-background.png'));
await sharp(splashSvg).png().toFile(join(MOBILE, 'splash.png'));

await sharp(iconSvg).resize(512, 512).png().toFile(join(STORE, 'icon-512.png'));
await sharp(featureSvg).resize(1024, 500).png().toFile(join(STORE, 'feature-graphic-1024x500.png'));

console.log('Generated Android launcher/splash and Google Play store graphic assets.');
