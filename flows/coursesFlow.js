module.exports = async function coursesFlow(page) {
    const url = 'https://app.digitalschool.co.il/members/test_live_student/courses/';
    const start = performance.now(); // ⏱️ UX: Start timing
  
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      const domLoaded = performance.now();
      console.log(`📥 DOM content loaded in ${(domLoaded - start).toFixed(0)}ms`); // ⏱️ UX: DOM load time
  
      await page.waitForSelector('.bb-course-item-wrap');
      const selectorReady = performance.now();
      console.log(`✅ First course card ready in ${(selectorReady - start).toFixed(0)}ms`); // 🧠 UX: First visible item
  
      const courseCount = await page.$$eval('.bb-course-item-wrap', cards => cards.length);
      console.log(`🎓 Found ${courseCount} courses rendered`); // 📊 UX: Course count accuracy
  
      await new Promise(r => setTimeout(r, 3000)); // 🧠 UX: Scroll responsiveness
      const end = performance.now();
      console.log(`🏁 Total page load wait: ${(end - start).toFixed(0)}ms`);
    } catch (err) {
      console.warn('⚠️ Courses page failed:', err.message);
    }
  };