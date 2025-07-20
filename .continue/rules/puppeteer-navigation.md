---
description: Prevent flaky navigation in Puppeteer for WordPress/BuddyBoss
---

✅ Saved Rule (Pin This Forever)

To prevent 404s in Puppeteer on WordPress/BuddyBoss:

Never depend on `.click()` for navigation to full-page routes.  
✅ Instead: extract `.href` and `page.goto()` it **after** JS hydration.

Why this works:
- ✅ Ensures BuddyPanel JavaScript is fully hydrated
- ✅ Preserves cookie/session context between routes
- ✅ Avoids flaky behavior tied to early DOM events

Use:
```js
await page.waitForFunction(() => {
  const el = document.querySelector('.bb-menu-item[data-balloon="פניות ואישורים"]');
  return !!(el && el.href && el.href.includes('/tickets'));
}, { timeout: 5000 });

const ticketUrl = await page.evaluate(() => {
  return [...document.querySelectorAll('.bb-menu-item[data-balloon]')]
    .find(el => el.getAttribute('data-balloon') === 'פניות ואישורים')?.href;
});

await page.goto(ticketUrl, { waitUntil: 'networkidle0' });
```