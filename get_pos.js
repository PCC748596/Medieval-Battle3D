import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000');
  
  await page.evaluate(() => {
    window.setInterval(() => {
        if(window.battleManager) {
            let k = window.battleManager.getKnights();
            if(k.length > 0) {
               console.log("Knight 0 pos:", k[0].x.toFixed(2), k[0].z.toFixed(2), "isTryingToMove:", k[0].isTryingToMove, "lastVelocity:", k[0].lastVelocity.x.toFixed(2), k[0].lastVelocity.z.toFixed(2));
            }
        }
    }, 1000);
  });
  
  page.on('console', msg => {
      if(msg.text().includes('Knight 0 pos:')) {
          console.log(msg.text());
      }
  });

  await page.waitForTimeout(4000);
  await browser.close();
})();
