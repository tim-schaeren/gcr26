// Frames the raw simulator captures in raw/ as store screenshots.
// Needs puppeteer-core and Google Chrome:  node render-screenshots.mjs
import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const SHOTS = [
  ['02-hint.png', 'Follow the clues through your city'],
  ['06-quest.png', 'Crack every quest'],
  ['04-board.png', 'Race the other teams'],
  ['03-activity.png', 'See every move as it happens'],
  ['05-chat.png', 'Your hosts are a message away'],
  ['01-teams.png', 'Join a team or start your own'],
];
const SIZES = [
  ['ios', 1320, 2868],      // 6.9" iPhone, which App Store Connect scales down
  ['android', 1080, 1920],  // Play wants 16:9 or wider for phone screenshots
];

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--allow-file-access-from-files'],
});
const page = await browser.newPage();
for (const [platform, w, h] of SIZES) {
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  for (const [i, [shot, caption]] of SHOTS.entries()) {
    const url = `file://${here}/screenshot.html?` + new URLSearchParams({ shot, caption, w, h });
    await page.goto(url, { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => window.laidOut === true);
    const out = path.join(here, '..', platform, 'screenshots', `${i + 1}-${shot.slice(3)}`);
    await page.screenshot({ path: out, clip: { x: 0, y: 0, width: w, height: h } });
    console.log(out);
  }
}
await browser.close();
