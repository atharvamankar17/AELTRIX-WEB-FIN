const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('requestfailed', request =>
    console.log('REQUEST FAILED:', request.url(), request.failure().errorText)
  );

  console.log('Navigating to apparel page...');
  await page.goto('http://localhost:5173/category/apparel/apparel.html', { waitUntil: 'networkidle2' });

  console.log('Clicking enable camera button...');
  try {
    await page.waitForSelector('#enable-camera-btn', { timeout: 3000 });
    await page.click('#enable-camera-btn');
    await new Promise(r => setTimeout(r, 2000));
  } catch (err) {
    console.log('Could not click button:', err.message);
  }

  await browser.close();
})();
