import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('pageerror', error => {
    console.log('PAGE ERROR STACK:', error.stack);
  });
  
  page.on('console', msg => {
      console.log('LOG:', msg.text());
  });

  await page.goto('http://localhost:3000');
  
  await page.waitForTimeout(3000);
  await browser.close();
})();
