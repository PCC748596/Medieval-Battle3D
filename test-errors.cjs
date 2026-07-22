const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('ERROR:', msg.text());
  });
  page.on('pageerror', error => console.log('PAGE ERROR:', error.stack));
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(4000);
  
  const archerCount = await page.evaluate(() => {
    // Force theme
    currentTheme = 'napoleonic_3d';
    templateMeshes['knights']['archer'] = null;
    const army = armies['knights']; // Red
    
    let triCount = 0;
    const warrior = new Warrior('knights', 'archer', 0, 0);
    warrior.mesh.traverse((child) => {
        if (child.isMesh) {
            const geom = child.geometry;
            if (geom.index) {
                triCount += geom.index.count / 3;
            } else if (geom.attributes.position) {
                triCount += geom.attributes.position.count / 3;
            }
        }
    });
    return triCount;
  });
  console.log("Triangle count for napoleonic_3d warrior:", archerCount);
  await browser.close();
})();
