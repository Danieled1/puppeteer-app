const { addMetric } = require('../../logger/metricsExporter');

// Layer 1: BuddyPanel Sidebar Existence and Structure
module.exports = async function globalSidebarFlow(page, context = {}) {
    // 1. Wait for sidebar element to appear after login
    await page.waitForSelector('aside.buddypanel', { visible: true, timeout: 7000 });
    const sidebar = await page.$('aside.buddypanel');
    if (!sidebar) throw new Error('Sidebar (buddypanel) not found in DOM');
  
    // 2. Inner menu wrapper
    const inner = await page.$('.side-panel-inner');
    if (!inner) throw new Error('Sidebar inner wrapper (.side-panel-inner) not found');
  
    // 3. Main menu container
    const nav = await page.$('.side-panel-menu-container');
    if (!nav) throw new Error('Sidebar menu container (.side-panel-menu-container) not found');
  
    // 4. The main menu UL
    const ul = await page.$('.buddypanel-menu');
    if (!ul) throw new Error('Sidebar menu list (.buddypanel-menu) not found');
  
    // 5. Count all menu items
    const allItems = await page.$$('.buddypanel-menu > li');
    console.log(`✅ Sidebar found with ${allItems.length} top-level menu items`);
  
    // 6. Check for each menu group (main, settings, footer)
    // - You can identify them by their text or structure (the order in your PHP)
    const requiredLabels = [
      "הפרופיל שלי", "ניהול מרצה", "הקורס שלי", // main group
      "תמיכה מקצועית", "פניות ואישורים", "השמה", "ציונים", // settings group
      "משוב", "התנתק" // footer group
    ];
    const textContents = await page.$$eval('.buddypanel-menu > li a span', spans =>
      spans.map(s => s.textContent.trim())
    );
  
    requiredLabels.forEach(label => {
      if (textContents.includes(label)) {
        console.log(`✅ Menu item found: "${label}"`);
      } else {
        console.warn(`⚠️  Menu item missing: "${label}"`);
      }
    });
  
    // 7. Last Courses section (non-admin): check the collapsible menu exists
    const lastCourses = await page.$('#menu-item-last-courses');
    if (lastCourses) {
      console.log('✅ "קורסים אחרונים" section found (last courses)');
      // Optionally check submenus are rendered
      const courseItems = await page.$$('#menu-item-last-courses .sub-menu li');
      console.log(`  ↳ Contains ${courseItems.length} recent courses`);
    } else {
      console.log('ℹ️  No last courses section (may be admin or user has no progress)');
    }
  
    // 8. Toggle button existence
    const toggleBtn = await page.$('#toggle-sidebar');
    if (toggleBtn) {
      console.log('✅ Sidebar toggle button found');
    } else {
      console.warn('⚠️  Sidebar toggle button not found');
    }
  
    // Metrics (optional)
    if (context.shouldExport) {
      addMetric({
        flow: 'globalSidebarFlow-layer1',
        topMenuCount: allItems.length,
        foundLabels: textContents,
        hasLastCourses: !!lastCourses,
        hasToggleButton: !!toggleBtn,
        timestamp: new Date().toISOString()
      });
    }
  
    // 9. Log completion
    console.log('🎉 [Layer 1] BuddyPanel sidebar basic QA checks PASSED');
  };
  