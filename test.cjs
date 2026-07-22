const { chromium } = require('playwright');
(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
    await page.goto('http://127.0.0.1:8080/MedievalBattles3D.html');
    await new Promise(r => setTimeout(r, 2000));
    await browser.close();
})();
