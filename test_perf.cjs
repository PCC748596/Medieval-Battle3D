const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('ERROR:', msg.text());
  });
  await page.goto('http://localhost:3000');
  
  // Wait a bit to ensure the page is loaded
  await page.waitForTimeout(1000);
  
  const perfData = await page.evaluate(() => {
    // spawn 10000 units
    changeBattlefieldSize(1000);
    spawnUnits('knights', 5000);
    spawnUnits('goblins', 5000);
    togglePause(); // Start battle if paused
    return { knights: battleManager.getKnights().length };
  });
  console.log("Perf data:", perfData);
  
  await page.waitForTimeout(3000); // let them fight for 3 seconds
  
  const fps = await page.evaluate(() => {
    return window.currentFPS;
  });
  console.log("FPS after 3s:", fps);
  
  await browser.close();
})();
