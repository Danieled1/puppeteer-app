module.exports = async function ticketFlow(page) {
    const start = performance.now();
    try {
      await page.goto('https://app.digitalschool.co.il/tickets/', { waitUntil: 'domcontentloaded' });
      const domReady = performance.now();
      console.log(`📥 Tickets page DOM loaded in ${(domReady - start).toFixed(0)}ms`);
  
      await page.waitForSelector('#createTicketBtn');
      await page.waitForSelector('#ticketHistoryBtn');
  
      await page.click('#createTicketBtn');
      console.log('📝 Opened new ticket form');
      await page.waitForSelector('select[name="acf[field_65f06082a4add]"]');
      const formReady = performance.now();
      console.log(`📄 Form ready in ${(formReady - start).toFixed(0)}ms`);
  
      const sectorOptions = await page.$$eval('select[name="acf[field_65f06082a4add]"] option', opts =>
        opts.map(opt => ({ value: opt.value, label: opt.textContent }))
      );
      console.log('🌐 ticket_sector options:', sectorOptions);
  
      await page.select('select[name="acf[field_65f06082a4add]"]', 'technical_support');
      await page.evaluate(() => {
        const el = document.querySelector('select[name="acf[field_65f06082a4add]"]');
        el.dispatchEvent(new Event('change', { bubbles: true }));
      });
      console.log('🔧 Sector selected and change event dispatched');
  
      await page.waitForFunction(() => {
        const select = document.querySelector('select[name="acf[field_65f064c9a4ae1]"]');
        return select && !select.disabled && select.options.length > 1;
      }, { timeout: 5000 });
  
      const subSectorOptions = await page.$$eval('select[name="acf[field_65f064c9a4ae1]"] option', opts =>
        opts.map(opt => ({ value: opt.value, label: opt.textContent.trim() }))
      );
      console.log('🌐 ticket_sector_subject options:', subSectorOptions);
  
      await page.evaluate(() => {
        const select = document.querySelector('select[name="acf[field_65f064c9a4ae1]"]');
        const labelToPick = 'שגיאה בקוד';
        for (const option of select.options) {
          if (option.textContent.trim() === labelToPick) {
            select.value = option.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            break;
          }
        }
      });
      console.log('✅ Sub-sector selected (by label)');
  
      await page.type('input[name="acf[field_65f060dba4ade]"]', 'בדיקה אוטומטית');
      console.log('📝 Title typed');
  
      await page.type('textarea[name="acf[field_65f06191a4adf]"]', 'בדיקה טכנית - לוודא קליטה תקינה.');
      console.log('📄 Content typed');
  
      const beforeSubmit = performance.now();
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        page.click('input[type="submit"]'),
      ]);
      const afterSubmit = performance.now();
      console.log(`📨 Ticket submitted in ${(afterSubmit - beforeSubmit).toFixed(0)}ms`);
  
      await page.click('#ticketHistoryBtn');
      console.log('📄 Opened ticket history');
  
      await page.waitForSelector('.ticket-row .content-button');
      const buttons = await page.$$('.ticket-row .content-button');
      if (buttons.length > 0) {
        const openModalStart = performance.now();
        await buttons[0].click();
        console.log(`📬 Opened most recent ticket modal`);
        await page.waitForSelector('.modal', { visible: true, timeout: 5000 });
  
        await new Promise(r => setTimeout(r, 1000));
        await page.click('.modal .close');
        await page.waitForFunction(() => {
          const m = document.querySelector('.modal');
          return m && m.classList.contains('hidden');
        }, { timeout: 3000 });
        const openModalEnd = performance.now();
        console.log(`📤 Modal open/close took ${(openModalEnd - openModalStart).toFixed(0)}ms`);
      }
  
      const end = performance.now();
      console.log(`🏁 Total ticket page flow: ${(end - start).toFixed(0)}ms`);
      if (end - start > 7000) console.warn('⚠️ Page slow (>7s)');
    } catch (err) {
      console.warn('⚠️ Ticket flow failed:', err.message);
    }
  };
  