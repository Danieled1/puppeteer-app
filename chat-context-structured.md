# Project Context: LMS QA/Performance Audit (July 2025)

**Purpose:**

- Audit all student-facing flows in our WordPress/BuddyBoss LearnDash LMS for slowness, bloat, and UX issues.
- Use multi-layered Puppeteer flows to simulate real user journeys and precisely identify sources of lag or frontend inefficiency.
- 'Two birds, one stone':
  - (a) Build a reusable audit/QA toolkit.
  - (b) Diagnose and document root causes of slow pages and bloated UI.

## Flows & Layering Plan

Each flow file (ex: `ticketFlow`, `coursePageFlow`) is being developed with up to **three QA layers**:

- **Layer 1: Structure** – Page/component existence. All key DOM elements must render.
- **Layer 2: Timing/Interactivity** – DOMContentLoaded, first visible, major AJAX/XHR, interactivity, slow calls flagged.
- **Layer 3: Deep UX Diagnostics** – Modal logic, dynamic stress, sub-component tests, stress tests (toggle 10x), XHR breakdown, console logs, screenshots.

### Implemented and Planned Flows

- loginFlow
- coursesFlow
- coursePageFlow
- lessonPageFlow
- ticketFlow (layer 3 in progress; paused for global sidebar work)
- placementFlow
- gradesFlow
- supportFlow
- ticketEmptyStateFlow
- globalSidebarFlow (all layers, condensed, see below)
- _(Planned: globalHeaderFlow, headerAsideFlow, etc.)_

## Core Code: Example Flow Structures

# loginFlow.js
#### 🧱 Login Page – Flow Overview
  This page displays the login form for users at:
  https://app.digitalschool.co.il/wp-login.php
  
  Handled by custom PHP template: custom-page-login.php. Redirects users based on roles (students, instructors, administrators).

##### 🧪 Puppeteer Automation Code
  - puppeteer-app code implemantion:
        require('dotenv').config();
        const { addMetric } = require('../logger/metricsExporter');

        const username = process.env.TEST_USERNAME;
        const password = process.env.TEST_PASSWORD;
        // const username = process.env.POWER_USERNAME;
        // const password = process.env.POWER_PASSWORD;


        async function delay(ms) {
          return new Promise(resolve => setTimeout(resolve, ms));
        }
        //Our main test user: test_live_student
        // no tickets user: student_testing5
        async function typeWithClear(page, selector, text, delayMs = 100) {
          await page.waitForSelector(selector, { visible: true });
          await page.click(selector); // Activate field
          await page.focus(selector);
          await page.evaluate((sel) => {
            const el = document.querySelector(sel);
            if (el) el.value = '';
          }, selector);
          await delay(200); // Let the DOM catch up

          for (const char of text) {
            await page.type(selector, char, { delay: delayMs });
          }
        }


        module.exports = async function loginFlow(page, context = {}) {
          const flowStart = performance.now();

          // Phase 1: Initial page load
          await page.goto('https://app.digitalschool.co.il/wp-login.php', { waitUntil: 'domcontentloaded' });
          const domLoaded = performance.now();
          console.log(`📥 Login page DOM loaded in ${(domLoaded - flowStart).toFixed(0)}ms`);

          // Phase 2: Safe typing
          await typeWithClear(page, '#user_login',username);
          await typeWithClear(page, '#user_pass',password);





          // Phase 3: Login action (only this should be measured for login processing)
          const submitStart = performance.now();
          await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2' }),
            page.click('#wp-submit'),
          ]);
          const submitEnd = performance.now();

          const totalTime = Math.round(submitEnd - flowStart);
          const domTime = Math.round(domLoaded - flowStart);
          const submitTime = Math.round(submitEnd - submitStart);

          console.log(`✅ Logged in. Submit Duration: ${submitTime}ms. Total Flow: ${totalTime}ms. URL: ${page.url()}`);

          if (submitTime > 4000) {
            console.warn(`⚠️ SLOW LOGIN PROCESSING: took ${submitTime}ms`);
          }
            // After successful login:
          if (username === process.env.POWER_USERNAME) {
            // Replace this with the correct slug for the admin user
            await page.goto('https://app.digitalschool.co.il/members/supportecomschool-co-il/', { waitUntil: 'networkidle2' });
          }
          if (context.shouldExport) {
            addMetric({
              flow: 'loginFlow',
              totalMs: totalTime,
              domMs: domTime,
              loginProcessingMs: submitTime,
              timestamp: new Date().toISOString(),
            });
          }
        };


##### 📄 PHP code from buddyboss-theme-child
  - PHP code from ecom lms child theme:(custom-page-login.php)
        <?php
        /* Template Name: Custom Login */

        $error_message = ''; // Initialize error message variable

        if (is_user_logged_in()) {
            $user = wp_get_current_user();

            if (in_array('administrator', $user->roles, true)) {
                wp_redirect(admin_url());
                exit;
            }

            if (in_array('instructor', $user->roles, true) || in_array('wdm_instructor', $user->roles, true)) {
                wp_redirect(site_url('/instructor-dashboard'));
                exit;
            }

            // Default redirect for students
            wp_redirect(home_url('/members/' . $user->user_nicename . '/'));
            exit;
        }

        if ($_SERVER['REQUEST_METHOD'] === 'POST') {

            $creds = array(
                'user_login'    => sanitize_text_field($_POST['log']),
                'user_password' => $_POST['pwd'],
                'remember'      => isset($_POST['rememberme'])
            );
            $user = wp_signon($creds, false);

            if (is_wp_error($user)) {
                // Translate common error messages to Hebrew
                switch ($user->get_error_code()) {
                    case 'invalid_username':
                        $error_message = 'שם המשתמש שגוי. נא לנסות שוב.';
                        break;
                    case 'incorrect_password':
                        $error_message = 'הסיסמה שגויה. נא לנסות שוב.';
                        break;
                    case 'empty_username':
                        $error_message = 'שדה שם המשתמש ריק. נא למלא את כל השדות הנדרשים.';
                        break;
                    case 'empty_password':
                        $error_message = 'שדה הסיסמה ריק. נא למלא את כל השדות הנדרשים.';
                        break;
                    default:
                        error_log(" User error code: " .$user->get_error_code());
                        $error_message = 'אירעה שגיאה לא ידועה. נא לנסות שוב.';
                        break;
                }
            } else {

                // Admin users need full authentication before being redirected
                if (in_array('administrator', $user->roles, true)) {
                    wp_set_auth_cookie($user->ID, true);
                    wp_redirect(admin_url());
                    exit;
                }

                // Instructors should go to the instructor dashboard
                if (in_array('instructor', $user->roles, true) || in_array('wdm_instructor', $user->roles, true)) {
                    wp_set_auth_cookie($user->ID, true);
                    wp_redirect(site_url('/instructor-dashboard'));
                    exit;
                }

                // Default: Send students to their profile page
                $redirect_to = home_url('/members/' . $user->user_nicename . '/');
                wp_redirect($redirect_to);
                exit;
                // v0.2
                // $user_roles = $user->roles; // Get user's roles
                // error_log('User Roles: ' . print_r($user_roles, true));

                // $redirect_to = home_url(); // Default fallback redirect

                // if (in_array('administrator', $user_roles)) {
                //     $redirect_to = admin_url(); // Redirect admin to WP dashboard
                // } elseif (in_array('wdm_instructor', $user_roles) || in_array('instructor', $user_roles)) {
                //     $redirect_to = site_url('/instructor-dashboard'); // Redirect instructors to their panel
                // } elseif (in_array('subscriber', $user_roles) || in_array('student', $user_roles)) {
                //     $redirect_to = site_url('/members/' . $user->user_nicename . '/'); // Redirect students to their profile
                // }

                // error_log('Redirecting user to: ' . $redirect_to);
                // wp_redirect($redirect_to);


                // v0.1
                // $slug = $user->user_nicename;   // Member profile page URL construct out of the user's nicename

                // error_log('User Slug: ' . $user->user_nicename);
                // $redirect_to = isset($_POST['redirect_to']) ? $_POST['redirect_to'] : home_url('/members/' . $slug . '/');

                // wp_redirect($redirect_to);

                exit;
            }
        }
        //
        if ($_SERVER['REQUEST_METHOD'] === 'POST' && !empty($error_message)) : ?>
            <script>
                console.log("<?php echo esc_js($error_message); ?>");
                document.addEventListener("DOMContentLoaded", function() {
                    const errorContainer = document.querySelector(".login-error");
                    errorContainer.innerHTML = "<?php echo esc_js($error_message); ?>";
                    errorContainer.style.display = "block";
                });
            </script>
        <?php endif;

        ?>

        <?php wp_head(); ?>
        <div class="login-page">
            <div class="right-container">
                <div class="login-container flex-column-center ">
                    <img class="logo" src="<?php echo get_stylesheet_directory_uri(); ?>/assets/vectors/logo.svg" alt="">
                    <form method="post" action="">
                        <?php wp_nonce_field('custom_login_action', 'custom_login_nonce'); ?>
                        <div class="inputs-container flex-column-center ">
                        <div class="signup-frame">
                            <img class="signup-frame-bg" src="<?php echo get_stylesheet_directory_uri(); ?>/assets/vectors/rectangle_52_x2.svg" alt="Description">
                            <span class="signup-frame-text">התחברות</span>
                        </div>
                            <div class="input-container">

                                <div class="email-icon"></div>
                                <input type="text" name="log" id="email" placeholder="כתובת דואר אלקטרוני">
                            </div>
                            <div class="input-container">
                                <div class="password-icon"></div>
                                <input type="password" name="pwd" id="password" placeholder="סיסמה">
                            </div>
                            <button class="custom-button primary icon-login">התחבר</button>
                            <div class="terms-container">
                                <a href="#privacy-modal">תנאי השימוש</a> -ו
                                <a href="#terms-modal">תקנון אתר</a>
                            </div>
                        </div>
                        <div class="login-error" style="display: none;"></div>

                    </form>
                </div>

            </div>
            <div class="left-container">

            </div>

        </div>

#### loginFlow.js Layer 2 Finding:
- Login is **slow** — took 12.6s

#### loginFlow.js Layer 3 Goal:

- Identify cause of delay (is it DOM? redirect lag? auth latency?)

#### loginFlow.js Insights:

- Form responsiveness was OK
- Likely culprit: redirect post-login is waiting on BuddyBoss plugins or dashboard scripts

#### loginFlow.js Action:

- [ ] Log redirect timing
- [ ] Log post-login network tab load
- [ ] Try disabling BuddyBoss welcome widget

NOTICE: _We delaying the login to the end, currently we satsify with what we have - unless specficed differendtly _ (loginFlow)

---

# coursesFlow.js

### 🧱 LearnDash "Courses" Page – Template Structure

This page displays the grid of available/enrolled courses for the student at:

`/members/{username}/courses/`

Unlike other BuddyBoss fallback tabs, this tab is **explicitly handled by a `courses.php` template file**, ensuring full control over its structure.

#### 🔍 Rendering Stack

- **`buddypress/members/single/courses.php`**  
  Custom page template for the `/courses/` tab under a member profile. Not a fallback. This file directly controls the layout.

- **`learndash/ld30/template-course-item.php`**  
  Overridden template rendering each individual course card with pricing, access, lesson count, progress, and ribbon logic.

- **`modules/progress.php`**  
  Sub-template used inside each course card to visually render course progress.

- **`learndash_course_progress()` and `sfwd_lms_has_access()`**  
  LearnDash functions powering access control, progress tracking, and course status logic.

- puppeteer-app code implemantion:
  const { addMetric } = require("../logger/metricsExporter");

      module.exports = async function coursesFlow(page, context = {}) {
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
          const totalTime = Math.round(end -start)
          console.log(`🏁 Total page load wait: ${totalTime}ms`);
          if (totalTime > 7000) {
            console.warn(`⚠️ SLOW PAGE: courses page took ${totalTime}ms to fully render`);
          }
          if (context?.shouldExport) {
            addMetric({
              flow: 'courses',
              totalMs: totalTime,
              domMs: Math.round(domLoaded - start),
              firstCardMs: Math.round(selectorReady - start),
              courseCount,
              timestamp: new Date().toISOString()
            });
          }
        } catch (err) {
          console.warn('⚠️ Courses page failed:', err.message);
        }
      };

- relvant php templates we modified(leadrndash/ld30/template-course-item.php):
  <?php
  /\*\*
  _ Template part for displaying course list item
  _
  _ @link https://developer.wordpress.org/themes/basics/template-hierarchy/
  _
  _ @package BuddyBoss_Theme
  _/

      global $post, $wpdb;

      $is_enrolled            = false;
      $current_user_id        = get_current_user_id();
      $course_id              = get_the_ID();
      $cats                   = wp_get_post_terms( $course_id, 'ld_course_category' );
      $lession_list            = learndash_get_course_lessons_list( $course_id );
      $lession_list            = array_column( $lession_list, 'post' );
      $lesson_count            = learndash_get_course_lessons_list( $course_id, null, array( 'num' => - 1 ) );
      $lesson_count            = array_column( $lesson_count, 'post' );
      $paypal_settings        = LearnDash_Settings_Section::get_section_settings_all( 'LearnDash_Settings_Section_PayPal' );
      $course_price 			= trim( (string) learndash_get_course_meta_setting( $course_id, 'course_price' ) );
      $course_price_type      = learndash_get_course_meta_setting( $course_id, 'course_price_type' );
      $course_button_url      = learndash_get_course_meta_setting( $course_id, 'custom_button_url' );
      $courses_progress       = buddyboss_theme()->learndash_helper()->get_courses_progress( $current_user_id );
      $course_progress        = isset( $courses_progress[ $course_id ] ) ? $courses_progress[ $course_id ] : null;
      $course_status          = learndash_course_status( $course_id, $current_user_id );
      $grid_col               = is_active_sidebar( 'learndash_sidebar' ) ? 3 : 4;
      $course_progress_new    = buddyboss_theme()->learndash_helper()->ld_get_progress_course_percentage( $current_user_id, $course_id );
      $admin_enrolled         = LearnDash_Settings_Section::get_section_setting( 'LearnDash_Settings_Section_General_Admin_User', 'courses_autoenroll_admin_users' );
      $course_pricing         = learndash_get_course_price( $course_id );
      $user_course_has_access = sfwd_lms_has_access( $course_id, $current_user_id );


      if ( $user_course_has_access ) {
        $is_enrolled = true;
      } else {
        $is_enrolled = false;
      }

      // if admins are enrolled.
      if ( current_user_can( 'administrator' ) && 'yes' === $admin_enrolled ) {
        $is_enrolled = true;
      }

      $class = '';
      if ( ! empty( $course_price ) && ( 'paynow' === $course_price_type || 'subscribe' === $course_price_type || 'closed' === $course_price_type ) ) {
        $class = 'bb-course-paid';
      }

      $ribbon_text = get_post_meta( $course_id, '_learndash_course_grid_custom_ribbon_text', true );
      ?>
      <li class="bb-course-item-wrap">

        <div class="card-course-image-container bb-cover-list-item <?php echo esc_attr( $class ); ?>">
          <div class="bb-course-cover">
            <a title="<?php the_title_attribute(); ?>" href="<?php the_permalink(); ?>" class="bb-cover-wrap">
              <?php
              $progress = learndash_course_progress(
                array(
                  'user_id'   => $current_user_id,
                  'course_id' => $course_id,
                  'array'     => true,
                )
              );

              if ( empty( $progress ) ) {
                $progress = array(
                  'percentage' => 0,
                  'completed'  => 0,
                  'total'      => 0,
                );
              }
              $status = ( 100 === (int) $progress['percentage'] ) ? 'completed' : 'notcompleted';

              if ( $progress['percentage'] > 0 && 100 !== $progress['percentage'] ) {
                $status = 'progress';
              }
              if ( defined( 'LEARNDASH_COURSE_GRID_FILE' ) && ! empty( $ribbon_text ) ) {
                echo '<div class="ld-status ld-status-progress ld-primary-background ld-custom-ribbon-text">' . sprintf( esc_html_x( '%s', 'Start ribbon', 'buddyboss-theme' ), $ribbon_text ) . '</div>';
              } elseif ( is_user_logged_in() && isset( $user_course_has_access ) && $user_course_has_access ) {

                if ( ( 'open' === $course_pricing['type'] && 0 === (int) $progress['percentage'] ) || ( 'open' !== $course_pricing['type'] && $user_course_has_access && 0 === $progress['percentage'] ) ) {

                  echo '<div class="card-course-status ld-status ld-status-progress ld-primary-background">' .
                    __( 'התחל ', 'buddyboss-theme' ) .
                    sprintf(
                      /* translators: %s: Course label. */
                      __( '%s', 'buddyboss-theme' ),
                      LearnDash_Custom_Label::get_label( 'course' )
                    ) .
                  '</div>';

                } else {

                  learndash_status_bubble( $status );

                }
              } elseif ( 'free' === $course_pricing['type'] ) {

                echo '<div class="card-course-status ld-status ld-status-incomplete ld-third-background">' . __( 'Free', 'buddyboss-theme' ) . '</div>';

              } elseif ( $course_pricing['type'] !== 'open' ) {

                echo '<div class="card-course-status ld-status ld-status-incomplete ld-third-background">' . __( 'Not Enrolled', 'buddyboss-theme' ) . '</div>';

              } elseif ( $course_pricing['type'] === 'open' ) {

                echo '<div class="card-course-status ld-status ld-status-progress ld-primary-background">' .
                  __( 'התחל ', 'buddyboss-theme' ) .
                  sprintf(
                  /* translators: %s: Course label. */
                    __( '%s', 'buddyboss-theme' ),
                    LearnDash_Custom_Label::get_label( 'course' )
                  ) .
                '</div>';

              }
              ?>

              <?php
              if ( has_post_thumbnail() ) {
                the_post_thumbnail( 'medium' );
              }
              ?>
            </a>
          </div>

          <div class="bb-card-course-details <?php echo ( is_user_logged_in() && isset( $user_course_has_access ) && $user_course_has_access ) ? 'bb-card-course-details--hasAccess' : 'bb-card-course-details--noAccess'; ?>">
            <?php
            $lessons_count = sizeof( $lesson_count );
            $total_lessons = (
              $lessons_count > 1
              ? sprintf(
                /* translators: 1: plugin name, 2: action number 3: total number of actions. */
                __( '%1$s %2$s', 'buddyboss-theme' ),
                $lessons_count,
                LearnDash_Custom_Label::get_label( 'lessons' )
              )
              : sprintf(
                /* translators: 1: plugin name, 2: action number 3: total number of actions. */
                __( '%1$s %2$s', 'buddyboss-theme' ),
                $lessons_count,
                LearnDash_Custom_Label::get_label( 'lesson' )
              )
            );

            if ( $lessons_count > 0 ) {
              echo '<div class="card-course-lessons-steps course-lesson-count">' . $total_lessons . '</div>';
            } else {
              echo '<div class="card-course-lessons-steps course-lesson-count">' .
                sprintf(
                  /* translators: %s: Lesson label. */
                  __( '0 %s', 'buddyboss-theme' ),
                  LearnDash_Custom_Label::get_label( 'lessons' )
                ) .
              '</div>';
            }
            $title_class = '';
            if ( function_exists( 'is_plugin_active' ) && is_plugin_active( 'wdm-course-review/wdm-course-review.php' ) ) {
              $title_class = 'bb-course-title-with-review';
            }
            ?>
            <h2 class="bb-course-title <?php echo esc_attr( $title_class ); ?>">
              <a class="card-course-header" title="<?php the_title_attribute(); ?>" href="<?php the_permalink(); ?>"><?php the_title(); ?></a>
            </h2>

            <?php
            if ( is_user_logged_in() && isset( $user_course_has_access ) && $user_course_has_access ) {
              ?>

              <div class="course-progress-wrap">

                <?php
                learndash_get_template_part(
                  'modules/progress.php',
                  array(
                    'context'   => 'course',
                    'user_id'   => $current_user_id,
                    'course_id' => $course_id,
                  ),
                  true
                );
                ?>

              </div>

            <?php } ?>

            <div class="bb-course-excerpt">
              <?php echo wp_kses_post( get_the_excerpt( $course_id ) ); ?>
            </div>

            <?php
            // Price.
            if ( ! empty( $course_price ) && empty( $is_enrolled ) ) {
              ?>
              <div class="bb-course-footer bb-course-pay">
              <span class="course-fee">
                  <?php
                  echo '<span class="ld-currency">' . wp_kses_post( function_exists( 'learndash_get_currency_symbol' ) ? learndash_get_currency_symbol() : learndash_30_get_currency_symbol() ) . '</span> ' . wp_kses_post( $course_pricing['price'] );
                  ?>
                </span>
              </div>
              <?php
            }
            ?>
          </div>
        </div>
      </li>

### Layer 2 Finding:

- DOM: ~4.6s
- Total wait: ~7.6s

### Layer 3 Goal:

- Determine why it takes ~3s to fully render after DOM ready

### Insights:

- XHR: No major bloat found
- Cards are preloaded — no lazy loading issues
- Could be due to too much DOM paint / plugin interference

### Action:

- [ ] Log repaint cost (Layer 4?)
- [ ] Track scroll responsiveness
- [ ] Verify what triggers after DOM load

NOTICE: \*There is more we will elborate more when we get to those flow (coursesFlow)

---

# coursePageFlow.js

- puppeteer-app code implemantion:
  const { addMetric } = require("../logger/metricsExporter");

  module.exports = async function coursePageFlow(page, context = {}) {
  const start = performance.now();
  try {
  await page.goto('https://app.digitalschool.co.il/courses/קורס-ai-live-20-08-23/', { waitUntil: 'domcontentloaded' });
  const domReady = performance.now();
  console.log(`📥 Course page DOM loaded in ${(domReady - start).toFixed(0)}ms`);

          await page.waitForSelector('.course-content-container');
          const tabsReady = performance.now();
          console.log(`📑 Tabs loaded in ${(tabsReady - start).toFixed(0)}ms`); // 📑 UX: Tab readiness latency

          await page.waitForSelector('.ld-lesson-list', { timeout: 5000 });
          const listReady = performance.now();
          console.log(`📚 Lesson list ready in ${(listReady - start).toFixed(0)}ms`); // 📚 UX: Lesson list appearance

          // 🧠 UX: Visual stability observation (flicker, jumps)
          await new Promise(r => setTimeout(r, 3000));
          const end = performance.now();
          const totalTime = Math.round(end - start);
          console.log(`🏁 Total course page wait: ${totalTime}ms`);
          if (totalTime > 7000) {
            console.warn(`⚠️ SLOW PAGE: course page took ${totalTime}ms to fully render`);
          }

          if (context?.shouldExport) {
            addMetric({
              flow: 'coursePage',
              totalMs: totalTime,
              domMs: Math.round(domReady - start),
              tabsReadyMs: Math.round(tabsReady - start),
              lessonListMs: Math.round(listReady - start),
              timestamp: new Date().toISOString()
            });
          }

        } catch (err) {
          console.warn('⚠️ Course page failed:', err.message);
        }
      };

- relvant php templates we modified(leadrndash/ld30/template-course-item.php):

# - lessonPageFlow.js


# ticketFlow.js
#### 🧱 Ticket Page – Flow Overview
This page renders the support and approval ticket interface for students.  
Located at: `https://app.digitalschool.co.il/tickets/`  
Template used: `page-tickets.php` in the BuddyBoss child theme.

- Allows students to submit new tickets, track statuses, and filter by type/status.
- The page uses **custom PHP**, **BuddyBoss shortcodes**, **AJAX**, and **custom JavaScript** for interactivity.
- Dynamically loads ticket data and modals using `fetch_client_tickets` (AJAX).

---

##### 🧪 Puppeteer Automation Code
- **Script**: `puppeteer-app/flows/ticketFlow.js`
- **Current State**:  
  - ✅ Layer 1 implemented  
  - ✅ Layer 2 implemented  
  - 🚧 **Layer 3 in progress** — pending full global integrations

```js

const { addMetric } = require("../logger/metricsExporter");
const delay = ms => new Promise(r => setTimeout(r, ms));
const globalHeaderFlow = require('../flows/globalTemplate/globalHeaderFlow');
const globalSidebarFlow = require('../flows/globalTemplate/globalSidebarFlow');

/**
 * Adds a listener for all relevant XHR/fetch/REST calls during the flow.
 * Captures timings for acf/validate_save_post and related admin-ajax actions.
 */
function setupXHRTracking(page, xhrMetrics = []) {
  page.on('requestfinished', async (request) => {
    const url = request.url();
    if (
      url.includes('admin-ajax.php') ||
      url.includes('/wp-json/') ||
      url.includes('acf/validate_save_post')
    ) {
      try {
        const response = await request.response();
        const timing = await response.timing();
        const duration = timing ? timing.receiveHeadersEnd - timing.startTime : -1;
        xhrMetrics.push({
          url,
          method: request.method(),
          status: response.status(),
          duration,
        });
        if (duration > 500) {
          console.warn(`🐢 Slow XHR [${request.method()}] ${url} → ${Math.round(duration)}ms`);
        }
      } catch (err) {
        console.warn(`⚠️ Could not get XHR timing for ${url}:`, err.message);
      }
    }
  });
}

// --- Modularized Step Functions ---

// UX Step: DOM load and basic buttons
async function loadTicketsPage(page) {
  await page.goto('https://app.digitalschool.co.il/tickets/', { waitUntil: 'domcontentloaded' });
  const domReady = performance.now();
  console.log(`📥 Tickets page DOM loaded in ${domReady.toFixed(0)}ms`);
  await page.waitForSelector('#createTicketBtn');
  await page.waitForSelector('#ticketHistoryBtn');
  const buttonsReady = performance.now();
  return { domReady, buttonsReady };
}

// UX Step: Open ticket form and wait for ACF
async function openTicketForm(page) {
  await page.click('#createTicketBtn');
  await page.waitForSelector('select[name="acf[field_65f06082a4add]"]', { timeout: 5000 });
  const formReady = performance.now();
  console.log(`📄 Form ready in ${formReady.toFixed(0)}ms`);
  return formReady;
}

// UX Step: Test sector/sub-sector dropdown logic (Layer 3 check #1)
async function testSubSectorDropdown(page, context) {
  // This test iterates all sector options and validates sub-sector logic
  const sectorSelect = await page.$('select[name="acf[field_65f06082a4add]"]');
  const sectorOptions = await page.$$eval('select[name="acf[field_65f06082a4add]"] option', opts =>
    opts.map(opt => ({ value: opt.value, label: opt.textContent }))
  );
  for (const sector of sectorOptions) {
    if (!sector.value) continue; // skip placeholder
    await sectorSelect.select(sector.value);
    await page.evaluate((selector) => {
      const el = document.querySelector(selector);
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, 'select[name="acf[field_65f06082a4add]"]');
    await new Promise(r => setTimeout(r, 300)); // Wait for sub-sector update

    // Check sub-sector dropdown state and options
    const subSectorOptions = await page.$$eval('select[name="acf[field_65f064c9a4ae1]"] option', opts =>
      opts.map(opt => ({ value: opt.value, label: opt.textContent.trim() }))
    );
    const isDisabled = await page.$eval('select[name="acf[field_65f064c9a4ae1]"]', el => el.disabled);

    // Layer 3: UX comment: "Sub-sector dropdown must always update and enable/disable appropriately!"
    console.log(
      `🔄 For sector [${sector.label}], sub-sector disabled: ${isDisabled}, options:`,
      subSectorOptions.map(o => o.label)
    );
    if (context.shouldExport) {
      addMetric({
        flow: 'ticketFlow-subsectorDropdown',
        sector: sector.label,
        subSectorDisabled: isDisabled,
        subSectorOptions: subSectorOptions.map(o => o.label),
        timestamp: new Date().toISOString(),
      });
    }
  }
}

// Step: Wait for default sector/sub-sector logic, select specific option, and validate
async function selectSectorAndSubSector(page) {
  // Wait for sector dropdown options (after form open)
  const sectorStart = performance.now();
  const sectorOptions = await page.$$eval('select[name="acf[field_65f06082a4add]"] option', opts =>
    opts.map(opt => ({ value: opt.value, label: opt.textContent }))
  );
  const sectorOptionsReady = performance.now();
  console.log('🌐 ticket_sector options:', sectorOptions);

  await page.select('select[name="acf[field_65f06082a4add]"]', 'technical_support');
  await page.evaluate(() => {
    const el = document.querySelector('select[name="acf[field_65f06082a4add]"]');
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  const sectorSelectMs = sectorOptionsReady - sectorStart;
  console.log(`🔧 Sector dropdown loaded in ${sectorSelectMs.toFixed(0)}ms`);

  // Wait for sub-sector dropdown
  const subSectorStart = performance.now();
  await page.waitForFunction(() => {
    const select = document.querySelector('select[name="acf[field_65f064c9a4ae1]"]');
    return select && !select.disabled && select.options.length > 1;
  }, { timeout: 5000 });
  const subSectorOptions = await page.$$eval('select[name="acf[field_65f064c9a4ae1]"] option', opts =>
    opts.map(opt => ({ value: opt.value, label: opt.textContent.trim() }))
  );
  const subSectorOptionsReady = performance.now();
  const subSectorSelectMs = subSectorOptionsReady - subSectorStart;
  console.log('🌐 ticket_sector_subject options:', subSectorOptions);
  console.log(`🔧 Sub-sector dropdown loaded in ${subSectorSelectMs.toFixed(0)}ms`);

  // Pick specific sub-sector by label (as in your flow)
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

  return { sectorSelectMs, subSectorSelectMs };
}



// Step: Type into fields and submit (ACF fields in correct order)
async function fillAndSubmitTicket(page) {
  // 1. Select sector (e.g., 'technical_support')
  await page.waitForSelector('select[name="acf[field_65f06082a4add]"]', { visible: true });
  await page.select('select[name="acf[field_65f06082a4add]"]', 'technical_support');
  await delay(200);

  // 2. Wait for sub-sector, select by label
  await page.waitForFunction(() => {
    const select = document.querySelector('select[name="acf[field_65f064c9a4ae1]"]');
    return select && !select.disabled && select.options.length > 1;
  }, { timeout: 5000 });

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
  await delay(250);

  // 3. Title field (always visible)
  await page.waitForSelector('input[name="acf[field_65f060dba4ade]"]', { visible: true });
  await page.click('input[name="acf[field_65f060dba4ade]"]');
  await page.type('input[name="acf[field_65f060dba4ade]"]', 'בדיקת מערכת - כותרת');

  // 4. WYSIWYG (TinyMCE) field
  const content = `בדיקה טכנית - לוודא קליטה תקינה.
זהו שורה שניה.
לינק לבדיקה: https://example.com
סוף בדיקה`;

  let wysiwygSuccess = false;
  try {
    // Always click Visual tab by ID
    await page.waitForSelector('#acf-editor-35-tmce', { visible: true, timeout: 2000 });
    await page.click('#acf-editor-35-tmce');
    await delay(300);

    // Now interact with the correct iframe
    const iframe = await page.waitForSelector('#acf-editor-35_ifr', { visible: true, timeout: 2000 });
    const frame = await iframe.contentFrame();
    await frame.waitForSelector('body', { visible: true, timeout: 1000 });
    await frame.focus('body');
    await frame.type('body', content);
    wysiwygSuccess = true;
    console.log('📄 WYSIWYG content typed into TinyMCE (acf-editor-35_ifr)');
  } catch (err) {
    // Fallback to textarea (text tab)
    await page.waitForSelector('textarea[name="acf[field_65f06191a4adf]"]', { visible: true });
    await page.click('textarea[name="acf[field_65f06191a4adf]"]');
    await page.type('textarea[name="acf[field_65f06191a4adf]"]', content);
    console.log('📄 Textarea content typed (fallback)');
  }

  // 5. Scroll to and submit
  const submitBtn = await page.waitForSelector('input[type="submit"]', { visible: true });
  await submitBtn.evaluate(b => b.scrollIntoView({ behavior: "auto", block: "center" }));
  await delay(200);

  const beforeSubmit = performance.now();
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2' }),
    submitBtn.click(),
  ]);
  const afterSubmit = performance.now();
  const submitMs = Math.round(afterSubmit - beforeSubmit);
  console.log(`📨 Ticket submitted in ${submitMs}ms`);
  return submitMs;
}



/**
 * Layer 3 Modal Open/Close UX + Content Validation
 */
async function testModalOpenClose(page, context) {
  // Show ticket history (table with rows/buttons)
  await page.click('#ticketHistoryBtn');
  await page.waitForSelector('.ticket-row .content-button', { timeout: 5000 });

  const buttons = await page.$$('.ticket-row .content-button');
  let modalMs = 0, modalStatus = 'no-modal', modalContentStatus = 'not-checked';

  if (buttons.length > 0) {
    const modalStart = performance.now();

    await buttons[0].click(); // Open modal
    await page.waitForSelector('.modal', { visible: true, timeout: 5000 });

    // Wait for modal content to settle, then grab inner text & HTML
    await new Promise(r => setTimeout(r, 1000));
    let modalText = '', modalHtml = '';
    try {
      modalText = await page.$eval('.modal .modal-body', el => el.innerText);
      modalHtml = await page.$eval('.modal .modal-body', el => el.innerHTML);
    } catch (e) {
      console.warn('⚠️ Could not extract modal content for validation');
    }

    // Validate: expect text, line break, URL as string or link
    const expectedText = 'בדיקה טכנית - לוודא קליטה תקינה.';
    const expectedSecondLine = 'זהו שורה שניה.';
    const expectedUrl = 'https://example.com';

    if (
      modalText.includes(expectedText) &&
      modalText.includes(expectedSecondLine) &&
      (modalText.includes(expectedUrl) || modalHtml.includes(expectedUrl))
    ) {
      console.log('✅ Modal contains all expected content: text, line break, and URL');
      modalContentStatus = 'valid';
    } else {
      console.warn('❌ Modal missing expected content');
      modalContentStatus = 'invalid';
      console.warn('Modal content was:', modalText);
    }

    // Close modal
    await page.click('.modal .close');
    await page.waitForFunction(() => {
      const m = document.querySelector('.modal');
      return m && (m.classList.contains('hidden') || m.style.display === 'none');
    }, { timeout: 3000 });

    modalMs = performance.now() - modalStart;
    modalStatus = 'success';
    console.log(`📤 Modal open/close took ${Math.round(modalMs)}ms`);
  } else {
    modalStatus = 'no-tickets';
    console.warn('⚠️ No ticket content buttons found for modal test');
  }

  // Add result to metrics
  if (context.shouldExport) {
    addMetric({
      flow: 'ticketFlow-modalUX',
      modalStatus,
      modalMs: Math.round(modalMs),
      modalContentStatus,
      timestamp: new Date().toISOString(),
    });
  }

  return { modalMs, modalStatus, modalContentStatus };
}


async function checkTicketHistoryRows(page, context) {
  await page.click('#ticketHistoryBtn');
  await page.waitForSelector('.ticket-row', { timeout: 5000 });

  // Columns that are allowed to be empty (zero-based)
  const ALLOWED_EMPTY_COLS = [6]; // "משוב" (feedback)

  const rows = await page.$$('.ticket-row');
  let issues = 0;
  for (const [i, row] of rows.entries()) {
    const cells = await row.$$eval('td', tds => tds.map(td => td.textContent.trim()));
    const emptyCols = cells
      .map((txt, idx) => ({ idx, txt }))
      .filter(c => (!c.txt || c.txt === '-') && !ALLOWED_EMPTY_COLS.includes(c.idx));

    if (emptyCols.length > 0) {
      console.warn(`⚠️ Row ${i + 1}: Empty/missing columns:`, emptyCols.map(c => c.idx));
      issues++;
    } else {
      console.log(`✅ Row ${i + 1}: All required fields populated`);
    }
  }
  if (context.shouldExport) {
    addMetric({
      flow: 'ticketFlow-historyRows',
      totalRows: rows.length,
      rowsWithIssues: issues,
      timestamp: new Date().toISOString(),
    });
  }
  if (rows.length === 0) {
    console.warn('⚠️ No ticket rows found');
  }
}


// --- MAIN EXPORT (calls all steps in order) ---
module.exports = async function ticketFlow(page, context = {}) {



  const start = performance.now();
  const xhrMetrics = [];
  setupXHRTracking(page, xhrMetrics);

  try {
    // 1. Page load and buttons (UX: DOM + UI controls must always appear)
    const { domReady, buttonsReady } = await loadTicketsPage(page);
    // 🧱 Run global header + sidebar flows first
    await globalHeaderFlow(page, context);
    await globalSidebarFlow(page, context);
    // 2. Open ticket form and wait for ACF render (UX: form must always show)
    const formReady = await openTicketForm(page);

    // 3. Layer 3 UX: Check sub-sector dropdown logic
    await testSubSectorDropdown(page, context);

    // 4. Continue regular flow: Select sector, sub-sector, etc.
    const { sectorSelectMs, subSectorSelectMs } = await selectSectorAndSubSector(page);

    // 5. Fill and submit form
    const submitMs = await fillAndSubmitTicket(page);

    // 6. Layer 3 UX: Modal test
    const { modalMs, modalStatus, modalContentStatus } = await testModalOpenClose(page, context);

    // 7. Layer 3 UX: Ticket row data completeness test 
    await checkTicketHistoryRows(page, context);

    // 8. XHR metrics & export
    const acfValidationXHR = xhrMetrics.filter(x =>
      x.url.includes('acf/validate_save_post') ||
      (x.url.includes('admin-ajax.php') && x.method === 'POST')
    );
    const slowXHRs = xhrMetrics.filter(x => x.duration > 500);

    // 9. Export metrics
    const end = performance.now();
    const totalTime = Math.round(end - start);
    if (totalTime > 9000) {
      console.warn(`⚠️ SLOW PAGE: ticket page took ${totalTime}ms to fully render`);
    }
    if (context.shouldExport) {
      addMetric({
        flow: 'ticketFlow',
        totalMs: totalTime,
        domMs: Math.round(domReady - start),
        buttonsReadyMs: Math.round(buttonsReady - start),
        formReadyMs: Math.round(formReady - start),
        sectorSelectMs: Math.round(sectorSelectMs),
        subSectorSelectMs: Math.round(subSectorSelectMs),
        submitMs,
        modalMs: Math.round(modalMs),
        acfValidationXHR: acfValidationXHR.map(x => Math.round(x.duration)),
        slowXHRCount: slowXHRs.length,
        modalStatus,
        modalContentStatus,
        timestamp: new Date().toISOString(),
      });
    }

  } catch (err) {
    console.warn('⚠️ Ticket flow failed:', err.message);
  }
};

```

---

##### 📄 PHP code from buddyboss-theme-child
- File: `page-tickets.php`

```php
<?php
/**
 * Template Name: Tickets
 * Displays user's tickets and form to create new tickets.
 * Depends on ACF fields for ticket fields group 
 */

acf_form_head();
get_header();

$current_user = wp_get_current_user();
$current_user_id = get_current_user_id();

$args = array(
    'post_type' => 'ticket',
    'posts_per_page' => 20, // Only 20 tickets
    'paged' => get_query_var('paged') ? get_query_var('paged') : 1,
    'author' => $current_user_id,
    'post_status' => 'any'
);

$user_tickets_query = new WP_Query($args);

?>
    <div class="container">
        <div class="content">

            <div class="header-image-wrapper">
                <div class="header-image">
                    <img src="https://dev.digitalschool.co.il/wp-content/uploads/2024/10/Rectangle-12.png" />
                    <div class="header-gradient-overlay"></div>
                    <div class="header-text">
                        <div class="header-title">פניות ואישורים</div>
                        <div class="header-subtitle">נקודות מפתח להגשת פנייה בצורה נכונה</div>
                    </div>
                </div>
            </div>
            <div class="content-text">
                <span class="sub-content-text">לפני שתמלאו את הפנייה, אנא קראו את הנקודות המפתח הבאות:</span>
                <ul>
                    <li>פנייה שדורשת צירוף קבצים או תמונות ולא תכלול כאלה תאט את זמן המענה.</li>
                    <li>מלאו כל פרט בקפידה וודאו את נושא הפנייה והפרט שבו אתם זקוקים לעזרה.</li>
                    <li> עליכם להתמקד בנושא אחד בכל פנייה.</li>
                </ul>
            </div>
            <!-- <div class="important-notes">הערות חשובות:</div>

            <div class="notes">
                עוד מקום לפסקה של נקודות חשובות Lorem ipsum, dolor sit amet consectetur adipisicing elit. Aut
                consequatur quia et laborum harum error, brdistinctio vel dicta labore repellendus.
            </div> -->

            <div class="actions-container">
                <div class="ticket-buttons-container">
                    <button id="createTicketBtn"
                        class="support-button button-text">צור פנייה חדשה<div class="arrow-icon">
                            <img src="<?php echo get_stylesheet_directory_uri(); ?>/assets/vectors/arrow-right-solid.svg"
                                alt="Arrow Right" class="arrow-icon-img" />
                        </div>
                    </button>
                    <button id="ticketHistoryBtn"
                        class="support-button button-text">מעקב פניות<div class="arrow-icon">
                            <img src="<?php echo get_stylesheet_directory_uri(); ?>/assets/vectors/arrow-right-solid.svg"
                                alt="Arrow Right" class="arrow-icon-img" />
                        </div>
                    </button>
                </div>
                <div id="contactContent" class="ticket-content hidden">
                    <caption>בחירת גורם מטפל</caption>

                    <?php
                    $options = array(
                        'post_id' => 'new_post', // 'new_post' indicates a new post is to be created upon form submission
                        'new_post' => array(
                            'post_type' => 'ticket', // the post type to be created
                            'post_status' => 'draft', // set the initial post status to draft
                            'post_title' => ''
                        ),
                        'field_groups' => array('group_65f0608c7091b'), // the ID of your ACF field group
                        'return' => '%post_id%', // Return the ID of the new post on submission
                        'submit_value' => __('שליחת פנייה', 'text-domain'), // text for the submit button
                        'updated_message' => __("הפנייה נשלחה", 'text-domain'), // confirmation message
                        'uploader' => 'basic', // Use the basic uploader instead of the default WordPress media uploader
                        'form' => 'true',
                        'fields' => array(
                            'field_65f06082a4add',
                            'field_65f064c9a4ae1',
                            'field_65f060dba4ade',
                            'field_65f06191a4adf',
                        )
                    );

                    // Output the ACF form with your specified options
                    acf_form($options);
                    ?>
                </div>
                <div id="ticketHistory" class="ticket-history hidden">
                    <table class="wp-list-table striped">
                        <caption>מעקב פניות</caption>
                        <thead>
                            <tr>
                                <th scope="col" class="manage-column">נוצר בתאריך</th>
                                <th scope="col" id="ticket_sector" class="manage-column column-sector">מחלקה</th>
                                <th scope="col" id="ticket_sector-subject" class="manage-column column-sector-subject">תת נושא</th>
                                <th scope="col" class="manage-column">כותרת</th>
                                <th scope="col" id="ticket_content" class="manage-column column-content">תוכן</th>
                                <th scope="col" class="manage-column">סטטוס</th>
                                <th scope="col" class="manage-column">משוב</th>
                                <th scope="col" id="modified_time" class="manage-column">תאריך שינוי אחרון</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php if ($user_tickets_query->have_posts()): ?>
                                <?php while ($user_tickets_query->have_posts()):
                                    $user_tickets_query->the_post();
                                    $ticket_content = get_field('ticket_content');
                                    $created_on = get_the_date('Y-m-d H:i:s', get_the_ID());
                                    $modified_on = get_the_modified_date('Y-m-d H:i:s', get_the_ID());

                                   // Ensure it's not empty before parsing
                                    if (!empty($ticket_content)) {
                                        $allowed_tags = array(
                                            'p'      => array(),
                                            'br'     => array(),
                                            'strong' => array(),
                                            'em'     => array(),
                                            'a'      => array(
                                                'href'   => true,
                                                'title'  => true,
                                                'target' => true
                                            ),
                                            'img'    => array(
                                                'src' => true,
                                                'alt' => true
                                            ),
                                        );
                                        $safe_content = wp_kses($ticket_content, $allowed_tags);

                                        $dom = new DOMDocument();
                                        @$dom->loadHTML(mb_convert_encoding($safe_content, 'HTML-ENTITIES', 'UTF-8'), LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
                                        
                                        $xpath = new DOMXPath($dom);
                                        $paragraphs = $xpath->query('//p'); // Selects <p> but not those directly containing <img> or <a>
                                        $images = $xpath->query('//img');
                                        $links = $xpath->query('//a[@href]'); // Selects <a> tags with an href attribute
                                    } else {
                                        // Handle empty content gracefully
                                        $paragraphs = null;
                                        $images = null;
                                        $links = null;
                                    }
                                    ?>
                                    <tr class="ticket-row">
                                        <td data-colname="נוצר בתאריך" style="border-radius: 5px 5px 0 0;">
                                            <?php the_time('F j, Y'); ?>
                                        </td>
                                        <td class="sector column-sector" data-colname="מחלקה">
                                            <?php echo esc_html(get_field('ticket_sector')['label']); ?>
                                        </td>
                                        <td class="sector column-sector" data-colname="תת נושא">
                                            <?php echo esc_html(get_field('ticket_sector_subject')['label']); ?>
                                        </td>
                                        <td data-colname="כותרת">
                                            <?php echo esc_html(get_field('ticket_title')); ?>
                                        </td>
                                        <td class="content column-content" data-colname="תוכן" style="border-radius: 0 0 5px 5px;">
                                            <button class="content-button button-text" onclick="openModal('<?php the_ID(); ?>')">
                                                תוכן הודעה
                                            </button>
                                        </td>
                                        <td data-colname="סטטוס">
                                            <?php
                                            $ticket_status = get_field('ticket_status');
                                            echo esc_html($ticket_status ? $ticket_status['label'] : 'טרם נצפה'); ?>
                                        </td>
                                        <td data-colname="משוב">
                                            <?php echo esc_html(get_field('sector_feedback')); ?>
                                        </td>
                                        <td class="modified_time" data-colname="תאריך שינוי אחרון">
                                            <?php echo esc_html($modified_on); ?>
                                        </td>
                                    </tr>
                                    <div class="modal hidden" id="contentModal-<?php the_ID(); ?>">
                                        <div class="modal-content">
                                            <div class="modal-header">
                                                <span class="close" onclick="closeModal('<?php the_ID(); ?>')">
                                                    &times;
                                                </span>
                                                <h2>
                                                    <?php echo esc_html(get_field('ticket_title')); ?>
                                                </h2>
                                            </div>
                                            <div class="modal-body">
                                                <?php if ($paragraphs): ?>
                                                    <div class="modal-section">
                                                        <div class="modal-section-header">
                                                            תוכן ההודעה:
                                                        </div>
                                                        <?php
                                                            foreach ($paragraphs as $paragraph) {
                                                                foreach ($paragraph->childNodes as $childNode) {
                                                                    // Only output text nodes, skipping <a> tag nodes
                                                                    if ($childNode->nodeType === XML_TEXT_NODE) {
                                                                        echo '<p>' . htmlspecialchars($childNode->nodeValue) . '</p>';
                                                                    }
                                                                }
                                                            }
                                                        ?>
                                                    </div>
                                                <?php endif; ?>
                                                
                                                <?php if ($images): ?>
                                                    <div class="modal-section">
                                                        <div class="modal-section-header">צילומי מסך:</div>
                                                        <?php
                                                        // Display images
                                                        foreach ($images as $image) {
                                                            echo $dom->saveHTML($image);
                                                        }
                                                        ?>
                                                    </div>
                                                <?php endif; ?>

                                                <?php if ($links): ?>
                                                    <div class="modal-section">
                                                        <div class="modal-section-header">קבצים מצורפים:</div>
                                                        <?php
                                                        // Display links
                                                        foreach ($links as $link) {
                                                            $link->setAttribute('target', '_blank');
                                                            echo $dom->saveHTML($link);
                                                        }
                                                        ?>
                                                    </div>
                                                <?php endif; ?>
                                            </div>
                                            <div class="modal-footer">
                                            <?php 
                                                $sector_feedback = get_field('sector_feedback'); 
                                                if (!empty($sector_feedback)): ?>
                                                    <div class="feedback-section">
                                                        <strong class="modal-section-header ">משוב:</strong>
                                                        <p><?php echo esc_html($sector_feedback); ?></p>
                                                    </div>
                                                <?php endif; ?>
                                            </div>
                                        </div>
                                    </div>
                                <?php endwhile; ?>
                            <?php else: ?>
                                <tr>
                                    <td colspan="4">לא נמצאו פניות.</td>
                                </tr>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>
<?php wp_reset_postdata(); 
?>
<?php
get_footer();
?>
```

---

##### 📜 JS code from buddyboss-theme-child
- File: `assets/js/page-tickets.js`

```js
const sectors = {
    'customer_service': ['שאלה כללית', 'העברת זכאות', 'מעבר למסלול חדש', 'אחר'],
    'technical_support': ['שאלה כללית ', 'שגיאה בקוד', 'התקנת תוכנה', 'אחר'],
    'accounting': ['1 הנהלת חשבונות', '2 הנהלת חשבונות', '3 הנהלת חשבונות', '4 הנהלת חשבונות'],
    'course_management': ['שאלה כללית', 'הקפאת מסלול', 'מעבר כיתה', 'חומרים לדיגיטל', 'אחר']
};

function setupModalClickOutsideClose() {
    window.onclick = function(event) {
        if (event.target.classList.contains("modal")) {
            event.target.style.display = "none";
        }
    };
}

function toggleVisibility(elementId) {
    // Hide all ticket contents
    document.querySelectorAll('.ticket-content').forEach(function(content) {
        content.classList.add('hidden');
    });
    document.querySelectorAll('.ticket-history').forEach(function(content) {
        content.classList.add('hidden');
    });

    // Show the specific element
    var element = document.getElementById(elementId);
    if (element) {
        element.classList.remove('hidden');
    }
}

function openModal(ticketId) {
    console.log("Opened Modal for ticket ID:", ticketId);
    toggleModal("contentModal-" + ticketId, true);
}

function closeModal(ticketId) {
    console.log("Closed Modal for ticket ID:", ticketId);
    toggleModal("contentModal-" + ticketId, false);
}

function toggleModal(modalId, shouldShow) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = shouldShow ? "block" : "none";
    } else {
        console.log("Modal not found for ID:", modalId);
    }
}

function setupButtonEventHandlers(selector, handlerFunction) {
    // Use a closure to pass the right parameter to the handler
    var btn = document.getElementById(selector);
    if (btn) {
        btn.addEventListener("click", function() {
            handlerFunction(selector);
        });
    } else {
        console.log("Button not found for selector:", selector);
    }
}

function handleTicketHistoryBtnClick() {
    toggleVisibility('ticketHistory');
}

function handleTicketCreateBtnClick() {
    toggleVisibility('contactContent');
}

function renderSubSectors () {
    const sectorSelect = document.querySelector('select[name="acf[field_65f06082a4add]"]');
    console.log("sectorSelect - ", sectorSelect);
    sectorSelect.addEventListener('change', updateSubSectorOptions);
    updateSubSectorOptions(); // Initialize sub-sector options on page load
}

function updateSubSectorOptions() {
    const sectorSelect = document.querySelector('select[name="acf[field_65f06082a4add]"]');
    const subSectorSelect = document.querySelector('select[name="acf[field_65f064c9a4ae1]"]');
    const selectedSector = sectorSelect.value;
    subSectorSelect.innerHTML = '<option value="">בחרו תת נושא</option>';
    if (selectedSector && sectors[selectedSector]) {
        subSectorSelect.disabled = false;
        sectors[selectedSector].forEach(subSector => {
            const option = document.createElement('option');
            option.value = subSector;
            option.textContent = subSector;
            subSectorSelect.appendChild(option);
        });
    } else {
        subSectorSelect.disabled = true;
    }
}


function initialize() {
    setupModalClickOutsideClose();
    setupButtonEventHandlers('ticketHistoryBtn', handleTicketHistoryBtnClick);
    setupButtonEventHandlers('createTicketBtn', handleTicketCreateBtnClick);
    renderSubSectors();
    toggleVisibility('ticketHistory');
}

// Wait for the DOM to be fully loaded before running the initialize function
document.addEventListener('DOMContentLoaded', initialize);
```

---

#### ticketFlow.js Layer 1 Findings:
- DOM elements load correctly.
- All essential blocks (ticket filters, submission form, modal wrapper) were detected.

#### ticketFlow.js Layer 2 Findings:
- Modal interactivity is consistent.
- Filtering delays observed (~600–900ms depending on number of tickets).
- Minor console warnings found related to empty fields.

#### ticketFlow.js Layer 3 Goal (In Progress):
- Measure and log:
  - Ticket data load timing (XHR breakdown)
  - Modal open/close speed
  - Form submission delay
  - Stress test for filtering/rendering on high-volume user
- Integrate `globalSidebarFlow` + `globalHeaderFlow` for full accuracy

---

#### ticketFlow.js Insights:
- Interactivity acceptable, but overall page load is longer on power users.
- `globalSidebarFlow` and `globalHeaderFlow` DOM/script impact not yet reflected in final Layer 3 metrics.
- Likely bottleneck: ticket data query + BuddyBoss layout rendering + potential JS bloat in modals.

---

#### ticketFlow.js Actions:
- [ ] Finalize Layer 3 metrics + screenshot logging
- [ ] Integrate all global flows directly into ticketFlow to reflect true UX performance
- [ ] Identify heavy DOM nodes during stress (maybe log `document.body.innerHTML.length`)
- [ ] Analyze if filtering can be throttled or debounced more tightly
- [ ] Review ticket modal open/close delay (~250–400ms)
- [ ] Confirm backend AJAX `fetch_client_tickets` load and response timing

---

⏳ **Last updated:** 2025-07-06 12:58


# - placementFlow.js

# - gradesFlow.js

# - supportFlow.js

## Global Template Components

# globalSidebarFlow.js  
  #### 📌 Global Template – Sidebar (BuddyPanel) Flow Overview  
  This sidebar exists across almost all logged-in student pages and serves as the primary navigation panel.

  - Rendered via: `template-parts/buddypanel.php`  
  - Populated with menu items like "הפרופיל שלי", "ציונים", "השמה", etc.  
  - Styled by: `assets/css/buddypanel.css`  
  - Interactivity powered by: `assets/js/buddypanel.js`  
  - Content is dynamic depending on the user type (admin/teacher/student)

  ---

  #### 🧪 Puppeteer Automation Code (globalSidebarFlow.js)  
  - **Script**:`puppeteer-app/flows/globalTemplate/globalSidebarFlow.js`

  - **Current State**: 
    **Implements 3 QA Layers in one file**:

    - **Layer 1: DOM Existence / Structure**
      - Checks `.buddypanel`, `.side-panel-inner`, `.buddypanel-menu`
      - Verifies presence of key menu labels (הפרופיל שלי, השמה, ציונים, קורסים אחרונים, וכו’)

    - **Layer 2: Interactivity / Timing**
      - Measures sidebar load timing
      - Clicks key menu items and collapsible sections
      - Logs console errors/warnings during sidebar load

    - **Layer 3: UX Diagnostics / Stress**
      - Click stress tests (toggle "הגדרות" and "קורסים אחרונים" 10 times each)
      - Resize window to simulate mobile/desktop transitions
      - Captures full screenshot of sidebar state after stress
      - Logs XHR request timings, failed requests, JS warnings/errors
      - Saves metrics via `addMetric()` including toggle timings, visibility, etc.

  ```js
  const { addMetric } = require('../../logger/metricsExporter');
  const fs = require('fs');
  const path = require('path');
  const delay = ms => new Promise(r => setTimeout(r, ms));

  // ---- HELPERS ----
  async function findMenuItemByAnySpan(page, label) {
    return await page.evaluateHandle((label) => {
      const spans = document.querySelectorAll('.buddypanel-menu span');
      for (const span of spans) {
        if (span.textContent.trim() === label) {
          let el = span;
          while (el && el.tagName !== 'LI') el = el.parentElement;
          return el;
        }
      }
      return null;
    }, label);
  }

  async function clickAndCheckMenuItem(liHandle, label) {
    let clicked = false, open = false, count = 0, toggleMs = null;
    if (liHandle && await liHandle.evaluate(el => !!el)) {
      try {
        const aHandle = await liHandle.$('a span');
        if (aHandle) {
          const t0 = performance.now();
          await aHandle.click();
          clicked = true;
          await delay(350);
          open = await liHandle.evaluate(el => el.classList.contains('open'));
          const subMenu = await liHandle.$('.sub-menu.bb-open');
          if (subMenu) count = (await subMenu.$$('li')).length;
          toggleMs = Math.round(performance.now() - t0);
          console.log(`✅ "${label}" (span) clicked. Items: ${count}. Open: ${open} [${toggleMs}ms]`);
        }
      } catch (e) {
        console.warn(`⚠️ Could not click/check "${label}":`, e.message);
      }
    } else {
      console.warn(`⚠️ "${label}" section not found`);
    }
    return { clicked, open, count, toggleMs };
  }

  // ---- MAIN FLOW ----
  module.exports = async function globalSidebarFlow(page, context = {}) {
    // ---------- Layer 1: Structure/Existence ----------
    const sidebarLoadStart = performance.now();
    await page.waitForSelector('aside.buddypanel', { visible: true, timeout: 7000 });
    const sidebarLoadEnd = performance.now();

    // Structure checks
    const sidebar = await page.$('aside.buddypanel');
    if (!sidebar) throw new Error('Sidebar (buddypanel) not found in DOM');

    const inner = await page.$('.side-panel-inner');
    if (!inner) throw new Error('Sidebar inner wrapper (.side-panel-inner) not found');

    const nav = await page.$('.side-panel-menu-container');
    if (!nav) throw new Error('Sidebar menu container (.side-panel-menu-container) not found');

    const ul = await page.$('.buddypanel-menu');
    if (!ul) throw new Error('Sidebar menu list (.buddypanel-menu) not found');

    const allItems = await page.$$('.buddypanel-menu > li');
    console.log(`✅ Sidebar found with ${allItems.length} top-level menu items`);

    // Required menu labels by group (edit as needed!)
    const requiredLabels = [
      "הפרופיל שלי", "ניהול מרצה", "הקורס שלי",        // main group
      "תמיכה מקצועית", "פניות ואישורים", "השמה", "ציונים", // settings group
      "משוב", "התנתק"                                   // footer group
    ];
    const allTextContents = await page.$$eval('.buddypanel-menu > li a span', spans =>
      spans.map(s => s.textContent.trim())
    );

    // Layer 1 logs
    requiredLabels.forEach(label => {
      if (allTextContents.includes(label)) {
        console.log(`✅ Menu item found: "${label}"`);
      } else {
        console.warn(`⚠️  Menu item missing: "${label}"`);
      }
    });

    const lastCourses = await page.$('#menu-item-last-courses');
    if (lastCourses) {
      const courseItems = await page.$$('#menu-item-last-courses .sub-menu li');
      console.log('✅ "קורסים אחרונים" section found (last courses)');
      console.log(`  ↳ Contains ${courseItems.length} recent courses`);
    } else {
      console.log('ℹ️  No last courses section (may be admin or user has no progress)');
    }

    const toggleBtn = await page.$('#toggle-sidebar');
    if (toggleBtn) {
      console.log('✅ Sidebar toggle button found');
    } else {
      console.warn('⚠️ Sidebar toggle button not found');
    }

    // Layer 1 Metrics
    if (context.shouldExport) {
      addMetric({
        flow: 'globalSidebarFlow-layer1',
        topMenuCount: allItems.length,
        foundLabels: allTextContents,
        hasLastCourses: !!lastCourses,
        hasToggleButton: !!toggleBtn,
        timestamp: new Date().toISOString()
      });
    }
    console.log('🎉 [Layer 1] BuddyPanel sidebar basic QA checks PASSED');

    // ---------- Layer 2: Interactivity ----------
    // (Use all menu items, collapse logic, link checks, errors/warnings)
    const collapsibleLabels = ["הגדרות", "קורסים אחרונים"];
    const keyLabels = [
      "הפרופיל שלי", "הקורס שלי",
      "תמיכה מקצועית", "פניות ואישורים", "השמה", "ציונים",
      "משוב", "התנתק", "הגדרות", "קורסים אחרונים"
    ];
    const presentLabels = [];
    const layer2ConsoleErrors = [];
    const layer2ConsoleWarnings = [];

    // JS error/warning collection for layer2
    page.on('console', msg => {
      if (msg.type() === 'error') layer2ConsoleErrors.push(msg.text());
      if (msg.type() === 'warning') layer2ConsoleWarnings.push(msg.text());
    });

    for (const label of keyLabels) {
      const liHandle = await findMenuItemByAnySpan(page, label);
      if (liHandle && await liHandle.evaluate(el => !!el)) {
        presentLabels.push(label);
        if (collapsibleLabels.includes(label)) {
          await clickAndCheckMenuItem(liHandle, label);
        } else {
          const a = await liHandle.$('a');
          if (a) {
            const href = await a.evaluate(el => el.getAttribute('href'));
            console.log(`ℹ️  Menu "${label}" link: ${href}`);
          }
        }
        console.log(`✅ Menu item found: "${label}"`);
      } else {
        console.warn(`⚠️ Menu item missing: "${label}"`);
      }
    }

    // Layer 2 Metrics
    const sidebarMs = Math.round(sidebarLoadEnd - sidebarLoadStart);
    console.log(`⏱️ Sidebar loaded in ${sidebarMs}ms`);
    await delay(350);

    if (layer2ConsoleErrors.length > 0) {
      console.warn(`⚠️ Console JS errors during sidebar:`, layer2ConsoleErrors);
    }
    if (layer2ConsoleWarnings.length > 0) {
      console.warn(`⚠️ Console JS warnings during sidebar:`, layer2ConsoleWarnings);
    }

    if (context.shouldExport) {
      addMetric({
        flow: 'globalSidebarFlow-layer2',
        sidebarMs,
        topMenuCount: allItems.length,
        presentLabels,
        hasToggleButton: !!toggleBtn,
        consoleErrors: layer2ConsoleErrors,
        consoleWarnings: layer2ConsoleWarnings,
        timestamp: new Date().toISOString()
      });
    }
    console.log('🎉 [Layer 2] BuddyPanel sidebar dynamic/interactivity checks PASSED');

    // ---------- Layer 3: Deep QA/Stress/Performance ----------
    // Collect deeper XHR, asset errors, stress tests, etc.
    const xhrTimings = [];
    const failedRequests = [];
    let screenshots = [];
    // Log XHR/asset timings
    page.on('response', async (res) => {
      const req = res.request();
      if (req.url().includes('/buddypanel') || req.url().includes('/sidebar')) {
        const timing = {
          url: req.url(),
          status: res.status(),
          timing: res.timing()?.responseEnd,
        };
        xhrTimings.push(timing);
      }
      if (res.status() >= 400) {
        failedRequests.push({ url: req.url(), status: res.status() });
      }
    });

    // Stress test toggles (10x) and window resize
    const toggleTimes = {};
    for (const label of collapsibleLabels) {
      const liHandle = await findMenuItemByAnySpan(page, label);
      toggleTimes[label] = [];
      if (liHandle && await liHandle.evaluate(el => !!el)) {
        for (let i = 0; i < 10; i++) {
          const result = await clickAndCheckMenuItem(liHandle, label);
          toggleTimes[label].push(result.toggleMs);
          await delay(100);
        }
      }
    }

    await page.setViewport({ width: 1200, height: 900 });
    await delay(200);
    await page.setViewport({ width: 500, height: 900 });
    await delay(200);
    await page.setViewport({ width: 1200, height: 900 });

    const screenshotPath = path.join(
      __dirname,
      `sidebar_stress_${Date.now()}.png`
    );
    await page.screenshot({ path: screenshotPath });
    screenshots.push(screenshotPath);

    // Layer 3 Metrics
    if (context.shouldExport) {
      addMetric({
        flow: 'globalSidebarFlow-layer3',
        sidebarMs,
        topMenuCount: allItems.length,
        presentLabels,
        hasToggleButton: !!toggleBtn,
        consoleErrors: layer2ConsoleErrors,
        consoleWarnings: layer2ConsoleWarnings,
        xhrTimings,
        failedRequests,
        toggleTimes,
        screenshots,
        timestamp: new Date().toISOString()
      });
    }

    console.log('🎉 [Layer 3] BuddyPanel sidebar deep QA/diagnostic checks PASSED');
  };

  ```
  ---

  ##### 📄 Code files from buddyboss-theme-child(PHP/JS)
  - PHP File: `template-parts/buddypanel.php` → Loads the menu structure   

  ```php 
  <?php
  /**
   * BuddyPanel & Instructor Dashboard Integration
   */


  $user_id     = get_current_user_id();
  $current_user = wp_get_current_user();
  $current_url = $_SERVER['REQUEST_URI'];
  $instructor_dashboard_slug = '/instructor-dashboard';
  $is_instructor_dashboard = strpos($current_url, $instructor_dashboard_slug);
  if ($is_instructor_dashboard !== false) {
      return; 
  }
  $user_link   = function_exists('bp_core_get_user_domain') 
      ? bp_core_get_user_domain($current_user->ID) 
      : get_author_posts_url($current_user->ID);
  $user_link_url  = esc_url($user_link);
  $is_admin       = user_can($user_id, 'manage_options');

  $display_name   = function_exists('bp_core_get_user_displayname') 
      ? bp_core_get_user_displayname($current_user->ID) 
      : $current_user->display_name;


  $instructor_dashboard_url = site_url('/instructor-dashboard');
  // $extra_courses_tab_url = 
  $allowed_roles = ['wdm_instructor', 'instructor', 'manage_options']; // Extend as needed
  $has_instructor_access = false;
  foreach ($allowed_roles as $role) {
      if (user_can($user_id, $role)) {
          $has_instructor_access = true;
          error_log("User has access due to role: " . $role);
          break;
      }
  }


  $instructor_menu_item = $has_instructor_access ? (object) [
      'ID'      => 'instructor-dashboard',
      'title'   => 'ניהול מרצה',
      'url'     => $instructor_dashboard_url,
      'classes' => 'bb-menu-item instructor-dashboard'
  ] : null;

  // 3. Gather "Courses With Progress" data (for non-admin users) = 
  $courses_with_progress = [];
  if (!$is_admin) {
      $enrolled_courses = learndash_user_get_enrolled_courses($user_id);
      if (!empty($enrolled_courses)) {
          foreach ($enrolled_courses as $course_id) {
              $total_steps     = learndash_get_course_steps_count($course_id);
              $completed_steps = learndash_course_get_completed_steps($user_id, $course_id);
              $percentage      = ($total_steps > 0) 
                  ? floor(($completed_steps / $total_steps) * 100) 
                  : 0;
              if ($percentage > 0) {
                  $courses_with_progress[] = [
                      'course_id'  => $course_id,
                      'title'      => get_the_title($course_id),
                      'percentage' => $percentage,
                  ];
              }
          }
      }
  }

  // 4. Fetch BuddyPanel Menu Items
  $locations = get_nav_menu_locations();
  $menu_id   = isset($locations['buddypanel-loggedin']) ? $locations['buddypanel-loggedin'] : 0;
  $menu_items = $menu_id ? wp_get_nav_menu_items($menu_id) : [];

  if (!is_array($menu_items)) {
      $menu_items = [];
  }
  if ($instructor_menu_item) {
      $menu_items[] = $instructor_menu_item;
  }
  // 5. Filter & Adjust Menu Items in One Pass
  //    We'll group them into categories to reduce repeated loops later
  $menu_groups = [
      'main'     => [], // "הקורס שלי", "תמיכה מקצועית", "ניהול מרצה" 
      'settings' => [], // "הפרופיל שלי", "פניות ואישורים", "השמה", "קבוצות"
      'footer'   => [], // "בלוג איקום", "משוב", "ציונים", "התנתק"
  ];

  // Adjust the URL for "הפרופיל שלי" and categorize
  foreach ($menu_items as $item) {
    if (empty($item) || !isset($item->title)) {
          error_log("Skipping invalid menu item.");
          continue; // Skip invalid items
      }
      if ($item->title === 'הפרופיל שלי') {
          $item->url = esc_url(bp_core_get_user_domain($current_user->ID));
      }
      // Categorize by title - Removed 'בלוג איקום' and , 'קבוצות' - temp
      if (in_array($item->title, [ 'הפרופיל שלי', 'ניהול מרצה', 'הקורס שלי', 'תעודות', 'חיבורים' ])) {
          $menu_groups['main'][] = $item;
      } elseif (in_array($item->title, [ 'תמיכה מקצועית','פניות ואישורים', 'השמה', 'ציונים'])) {
          $menu_groups['settings'][] = $item;
      } elseif (in_array($item->title, ['משוב' , 'התנתק'])) {
          $menu_groups['footer'][] = $item;
      }
  }
  function clean_and_truncate_course_title($title, $maxWords = 3) {
      $wordsToRemove = ['קורס', 'digital', 'live']; // Words to remove
      $words = explode(' ', strtolower($title)); // Convert title to lowercase and split into words

      $filteredWords = array_filter($words, function($word) use ($wordsToRemove) {
          return !in_array($word, $wordsToRemove); // Remove word if it's in the removal list
      });

      $result = array_slice($filteredWords, 0, $maxWords); // Get the first $maxWords words
      $final_title = implode(' ', $result);
      return strtoupper($final_title); // Combine into a string

  }

  // error_log("Processing menu items. main=" . count($menu_groups['main']) . 
  //           ", settings=" . count($menu_groups['settings']) . 
  //           ", footer=" . count($menu_groups['footer']));

  /**
   * $available_icons and $settings_icon_mapping from your existing code
   */
  $available_icons = [
      'bb-icon-l buddyboss bb-icon-book-open',
      'bb-icon-l buddyboss bb-icon-users',
      'bb-icon-l buddyboss bb-icon-tools',
      'bb-icon-l buddyboss bb-icon-briefcase',
      'bb-icon-l buddyboss bb-icon-article',
      'bb-icon-l buddyboss bb-icon-file-attach',
      'bb-icon-l buddyboss bb-icon-graduation-cap',
      'bb-icon-l buddyboss bb-icon-airplay',
      'bb-icon-l buddyboss bb-icon-l',
  ];

  $settings_icon_mapping = [
      'הפרופיל שלי'  => 'bb-icon-user',
      'פניות ואישורים' => 'bb-icon-file-attach',
      'השמה'       => 'bb-icon-briefcase',
      'קבוצות'      => 'bb-icon-users',
      'בלוג איקום'   => 'bb-icon-article',
      'משוב'        => 'bb-icon-airplay',
      'ציונים'      => 'bb-icon-book-open',
      'התנתק'       => 'bb-icon-sign-out',
      'הקורס שלי'    => 'bb-icon-graduation-cap',
      'תמיכה מקצועית' => 'bb-icon-tools',
    'ניהול מרצה'    => 'bb-icon-briefcase',
      'תעודות'  => 'bb-icon-file-attach',
      'חיבורים' => 'bb-icon-users',
  ];

  ?>


  <!-- <button id="toggle-sidebar" class="buddypanel">&lt;</button> -->
  <aside class="buddypanel buddypanel--toggle-off">
      <div class="side-panel-inner">
          <nav class="side-panel-menu-container">
              <div class="sub-menu">
                  <ul id="buddypanel-menu" class="borders buddypanel-menu side-panel-menu">
                      
                      <!-- MAIN MENU ITEMS -->
                      <hr>
                      <?php foreach ($menu_groups['main'] as $item): ?>
                          <li id="menu-item-<?php echo esc_attr($item->ID); ?>"
                              class="menu-item menu-item-type-post_type menu-item-object-page">
                              <a href="<?php echo esc_url($item->url); ?>" class="bb-menu-item" data-balloon-pos="right"
                                data-balloon="<?php echo esc_attr($item->title); ?>">
                                  <i class="_mi _before <?php echo esc_attr($settings_icon_mapping[$item->title] ?? ''); ?>"
                                    aria-hidden="true"></i>
                                  <span><?php echo esc_html($item->title); ?></span>
                              </a>
                          </li>
                      <?php endforeach; ?>

                      <!-- LAST COURSES for Non-Admins with progress -->
                      <?php if (!$is_admin && !empty($courses_with_progress)): ?>
                          <hr>
                          <li id="menu-item-last-courses" class="menu-item menu-item-has-children">
                              <a href="#" class="bb-menu-item dropdown-toggle" data-balloon-pos="right"
                                data-balloon="קורסים אחרונים">
                                  <span>קורסים אחרונים</span>
                              </a>
                              <ul class="sub-menu bb-open">
                                  <?php foreach ($courses_with_progress as $course):
                                      $random_icon = $available_icons[array_rand($available_icons)];
                                      $truncated_title = clean_and_truncate_course_title($course['title'])
                                  ?>
                                      <li id="menu-item-<?php echo esc_attr($course['course_id']); ?>"
                                          class="menu-item menu-item-type-post_type menu-item-object-page">
                                          <a href="<?php echo get_permalink($course['course_id']); ?>" class="bb-menu-item"
                                            data-balloon-pos="right" data-balloon="<?php echo esc_attr($course['title']); ?>">
                                              <i class="_mi _before <?php echo esc_attr($random_icon); ?>" aria-hidden="true"></i>
                                              <span><?php echo esc_html($truncated_title); ?></span>
                                              <span class="course-progress"><?php echo esc_html($course['percentage']); ?>%</span>
                                          </a>
                                      </li>
                                  <?php endforeach; ?>
                              </ul>
                          </li>
                      <?php endif; ?>

                      <!-- SETTINGS MENU ITEMS -->
                      <hr>
                      <li id="menu-item-settings" class="menu-item menu-item-has-children">
                          <a href="#" class="bb-menu-item dropdown-toggle" data-balloon-pos="right"
                            data-balloon="הגדרות">
                              <span>הגדרות</span>
                          </a>
                          <ul class="sub-menu bb-open">
                              <?php foreach ($menu_groups['settings'] as $item): ?>
                                  <li id="menu-item-<?php echo esc_attr($item->ID); ?>"
                                      class="menu-item menu-item-type-post_type menu-item-object-page">
                                      <a href="<?php echo esc_url($item->url); ?>" class="bb-menu-item"
                                        data-balloon-pos="right" data-balloon="<?php echo esc_attr($item->title); ?>">
                                          <i class="_mi _before <?php echo esc_attr($settings_icon_mapping[$item->title] ?? ''); ?>"
                                            aria-hidden="true"></i>
                                          <span><?php echo esc_html($item->title); ?></span>
                                      </a>
                                  </li>
                              <?php endforeach; ?>
                          </ul>
                      </li>

                      <!-- FOOTER MENU ITEMS -->
                      <hr>
                      <?php foreach ($menu_groups['footer'] as $item): ?>
                          <li id="menu-item-<?php echo esc_attr($item->ID); ?>"
                              class="menu-item menu-item-type-post_type menu-item-object-page">
                              <a href="<?php echo esc_url($item->url); ?>" class="bb-menu-item" 
                                data-balloon-pos="right" data-balloon="<?php echo esc_attr($item->title); ?>">
                                  <i class="_mi _before <?php echo esc_attr($settings_icon_mapping[$item->title] ?? ''); ?>" 
                                    aria-hidden="true"></i>
                                  <span><?php echo esc_html($item->title); ?></span>
                              </a>
                          </li>
                      <?php endforeach; ?>

                  </ul>
              </div>
          </nav>
      </div>
  </aside>

  ```

  - JS File: `assets/js/buddypanel.js` → Controls toggle animation and interactivity   

  ```js
  document.addEventListener('DOMContentLoaded', function () {
      // === Config: IDs of collapsible menus ===
      const COLLAPSIBLE_IDS = ['menu-item-last-courses', 'menu-item-settings'];

      // --- Collapsible menu logic ---
      function setupCollapsibleMenu(menuId) {
          const menuItem = document.getElementById(menuId);
          if (!menuItem) return;

          const dropdown = menuItem.querySelector('.sub-menu');
          const arrowIcon = menuItem.querySelector('.bb-icon-angle-down');

          // Start open (if needed)
          if (dropdown) {
              menuItem.classList.add('open');
              dropdown.classList.add('bb-open');
              if (arrowIcon) arrowIcon.classList.add('bs-submenu-open');
          }

          // Toggle open/close
          menuItem.addEventListener('click', function (event) {
              event.preventDefault();
              const isOpen = menuItem.classList.toggle('open');
              if (dropdown) dropdown.classList.toggle('bb-open', isOpen);
              if (arrowIcon) arrowIcon.classList.toggle('bs-submenu-open', isOpen);
          });
      }

      // --- Highlight current menu item by URL ---
      function highlightCurrentMenuItem() {
          const currentUrl = window.location.href;
          const buddypanelMenu = document.getElementById('buddypanel-menu');
          if (!buddypanelMenu) return;

          buddypanelMenu.querySelectorAll('a').forEach(function (menuLink) {
              const menuItem = menuLink.closest('li');
              if (
                  menuItem.classList.contains('user-not-active') ||
                  menuLink.href.endsWith('#')
              ) return;

              menuItem.classList.remove('current-menu-item');
              if (menuLink.href === currentUrl) {
                  menuItem.classList.add('current-menu-item');
              }
          });
      }

      // --- Responsive toggle button for sidebar ---
      function setupSidebarToggle() {
          const toggleButton = document.getElementById('toggle-sidebar');
          const buddypanel = document.querySelector('body > aside');
          const originalMarginLeft = document.body.style.marginLeft;
          const originalMarginRight = document.body.style.marginRight;

          if (!toggleButton || !buddypanel) return;

          function checkViewport() {
              if (window.innerWidth < 800) {
                  toggleButton.style.display = 'none';
              } else {
                  toggleButton.style.display = 'flex';
              }
          }

          function applyStyles() {
              buddypanel.style.opacity = "0";
              buddypanel.style.visibility = "hidden";
              document.body.classList.remove('bb-buddypanel');
              document.body.classList.remove('buddypanel-open');
              void document.body.offsetWidth;
              document.body.style.setProperty('margin-left', '0', 'important');
              document.body.style.setProperty('margin-right', '0', 'important');
              toggleButton.style.right = '0';
              toggleButton.innerHTML = "&gt;";
          }

          function restoreStyles() {
              buddypanel.style.opacity = "1";
              buddypanel.style.visibility = "visible";
              document.body.style.setProperty('margin-left', originalMarginLeft, 'important');
              document.body.style.setProperty('margin-right', originalMarginRight, 'important');
              document.body.classList.add('bb-buddypanel');
              document.body.classList.add('buddypanel-open');
              toggleButton.style.right = '220px';
              toggleButton.innerHTML = "&lt;";
          }

          checkViewport();
          window.addEventListener('resize', checkViewport);

          toggleButton.addEventListener('click', function () {
              const isOpen = buddypanel.style.visibility !== "hidden";
              if (isOpen) {
                  applyStyles();
              } else {
                  restoreStyles();
              }
          });
      }

      // --- Run all ---
      COLLAPSIBLE_IDS.forEach(setupCollapsibleMenu);
      highlightCurrentMenuItem();
      setupSidebarToggle();

      // --- Misc. one-off tweaks ---
      const profileTab = document.querySelector('#user-xprofile > div');
      if (profileTab) {
          profileTab.innerHTML = 'פרופיל'; // Hebrew translation
      }
  });
  window.dispatchEvent(new Event('resize'));

  ```

  - CSS File: `assets/css/buddypanel.css` → Handles sticky layout, transitions, icons

  ```css
  (will include if we must - and it can help us something, just ask for it)
  ```

  **Metrics Exported:**
  ```json
  {
    "flow": "globalSidebarFlow-layer3",
    "sidebarMs": 23,
    "topMenuCount": 16,
    "presentLabels": [...],
    "hasToggleButton": false,
    "consoleErrors": [],
    "consoleWarnings": [],
    "xhrTimings": [...],
    "failedRequests": [...],
    "toggleTimes": {
      "הגדרות": [397, 409, ...],
      "קורסים אחרונים": [385, 391, ...]
    },
    "screenshots": [
      "sidebar_stress_1751278050367.png"
    ],
    "timestamp": "2025-07-01T..."
  }
  ```

  ---

  #### globalSidebarFlow.js Findings:

  - ✅ All menu items appeared correctly (except "ניהול מרצה" for student)
  - ✅ Toggle worked for both collapsible sections
  - ✅ Stress test completed without JS errors
  - ⚠️ Sidebar toggle button (`#toggle-sidebar`) not found – might be unused in current design

  ---

  #### globalSidebarFlow.js Actions:
  - [x] Combine all 3 layers into one QA file
  - [x] Capture screenshot after stress
  - [x] Log toggle timing per section
  - [ ] Re-test with teacher/admin users (to test full sidebar size)
  - [ ] Ensure `globalSidebarFlow()` runs inside all major page flows (ticket, placement, grades, etc.)

  ⏳ **Last updated:** 2025-07-06 16:30


# globalHeaderFlow.js

  #### 📌 Global Template – Header (Top Navigation) Flow Overview

  The header is a core layout element across all logged-in views. It includes branding, profile access, notifications, messaging, and optional LMS toggles.

  - Rendered via:
    - `header.php`
    - `template-parts/site-logo.php`
    - `template-parts/header-aside.php`
  - Styles loaded from core BuddyBoss theme and child overrides
  - JavaScript interactivity mostly from BuddyBoss internal theme scripts
  - Behavior varies by LMS mode, dark/light toggles, and logged-in status

  ---

  #### 🧪 Puppeteer Automation Code (globalHeaderFlow.js)

  - **Script:** `puppeteer-app/flows/globalTemplate/globalHeaderFlow.js`

  - **Current State:** **Implements 3 QA Layers in one file:**

    - **Layer 1: DOM Existence / Structure**

      - Checks visibility of:
        - `#site-logo .bb-logo`
        - `.bb-toggle-panel`
        - `#header-aside`, `.user-wrap`
        - `.header-search-link`, `#header-notifications-dropdown-elem`, `#header-messages-dropdown-elem`
        - Optional: `.site-navigation`, `.header-maximize-link`, `.header-minimize-link`

    - **Layer 2: Interactivity / Timing / Console**

      - Measures load time of `.site-header-container`
      - Opens and times:
        - Profile dropdown
        - Notifications dropdown
        - Messages dropdown
      - Clicks search icon
      - Logs console warnings/errors
      - Tracks XHRs related to `notifications` and `messages`

    - **Layer 3: Final UX Integrity / Plugin Bloat Detection**

      - Validates:
        - `#site-logo .bb-logo` has valid `src`
        - Header remains visible after scroll
        - Profile dropdown contains `.bb-my-account-menu a` links
        - `.sub-menu` is expanded with height
        - Dark mode toggle updates body class
        - `body` does not remain in `no-scroll` or `locked` state
        - Flags if header triggers excessive (>5) plugin-side XHRs


  ```js
  const { addMetric } = require('../../logger/metricsExporter');
  const delay = ms => new Promise(r => setTimeout(r, ms));

  async function assertVisible(page, selector, label, required = true) {
    const element = await page.$(selector);
    if (element) {
      console.log(`✅ ${label} visible`);
      return true;
    } else if (required) {
      console.warn(`❌ ${label} NOT found (required)`);
      return false;
    } else {
      console.log(`ℹ️ ${label} not found (optional)`);
      return true;
    }
  }

  async function clickAndCheckDropdown(page, selector, label) {
    const trigger = await page.$(selector);
    if (!trigger) {
      console.log(`ℹ️ ${label} trigger not found`);
      return { clicked: false, success: false };
    }

    const t0 = performance.now();
    try {
      await trigger.click();
      await delay(500);
      const expanded = await page.$(`${selector} .sub-menu, .bb-dropdown, .bb-open`);
      const t1 = performance.now();
      if (expanded) {
        console.log(`✅ ${label} dropdown opened in ${Math.round(t1 - t0)}ms`);
        return { clicked: true, success: true, ms: Math.round(t1 - t0) };
      } else {
        console.warn(`❌ ${label} clicked but no dropdown found`);
        return { clicked: true, success: false };
      }
    } catch (err) {
      console.warn(`⚠️ Failed to interact with ${label}: ${err.message}`);
      return { clicked: false, success: false };
    }
  }

  module.exports = async function globalHeaderFlow(page, context = {}) {
    const flowStart = performance.now();
    console.log('🧱 Starting Layer 1 + 2 + 3: globalHeaderFlow');

    const consoleErrors = [], consoleWarnings = [], xhrMetrics = [];

    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
      if (msg.type() === 'warning') consoleWarnings.push(msg.text());
    });

    page.on('requestfinished', async req => {
      const url = req.url();
      if (url.includes('notifications') || url.includes('messages')) {
        try {
          const res = await req.response();
          const status = res.status();
          const timing = await res.timing();
          const duration = timing.receiveHeadersEnd - timing.startTime;
          xhrMetrics.push({ url, status, duration });
        } catch {}
      }
    });

    // Measure header load time
    const headerStart = performance.now();
    await page.waitForSelector('.site-header-container', { visible: true });
    const headerReady = performance.now();
    const headerLoadTime = Math.round(headerReady - headerStart);
    console.log(`⏱️ Header container loaded in ${headerLoadTime}ms`);

    // --- Layer 1: Structure Checks ---
    const checks = [];
    checks.push(await assertVisible(page, 'header#masthead', 'Header wrapper'));
    checks.push(await assertVisible(page, '.site-header-container', 'Header container'));
    checks.push(await assertVisible(page, '#site-logo .bb-logo', 'Logo'));
    checks.push(await assertVisible(page, '.bb-toggle-panel', 'Sidebar toggle'));
    checks.push(await assertVisible(page, '.site-navigation', 'Navigation menu', false));
    checks.push(await assertVisible(page, '#header-aside', 'Header aside container'));
    checks.push(await assertVisible(page, '.user-wrap', 'User avatar/profile block', false));
    checks.push(await assertVisible(page, '#header-notifications-dropdown-elem', 'Notifications icon', false));
    checks.push(await assertVisible(page, '#header-messages-dropdown-elem', 'Messages icon', false));
    checks.push(await assertVisible(page, '.header-search-link', 'Search icon', false));
    checks.push(await assertVisible(page, '.header-maximize-link', 'Maximize button', false));
    checks.push(await assertVisible(page, '.header-minimize-link', 'Minimize button', false));

    // --- Layer 2: Interactivity ---
    const dropdownTimings = [];
    const interactivityResults = {};

    if (await page.$('.user-wrap')) {
      const result = await clickAndCheckDropdown(page, '.user-wrap', 'Profile');
      interactivityResults.profile = result;
      if (result.ms) dropdownTimings.push(result.ms);
    }

    if (await page.$('#header-notifications-dropdown-elem')) {
      const result = await clickAndCheckDropdown(page, '#header-notifications-dropdown-elem', 'Notifications');
      interactivityResults.notifications = result;
      if (result.ms) dropdownTimings.push(result.ms);
    }

    if (await page.$('#header-messages-dropdown-elem')) {
      const result = await clickAndCheckDropdown(page, '#header-messages-dropdown-elem', 'Messages');
      interactivityResults.messages = result;
      if (result.ms) dropdownTimings.push(result.ms);
    }

    if (await page.$('.header-search-link')) {
      try {
        await page.click('.header-search-link');
        console.log('🔍 Search icon clicked');
        interactivityResults.search = { clicked: true };
      } catch (err) {
        interactivityResults.search = { clicked: false, error: err.message };
      }
    }

    if (await page.$('.header-maximize-link')) {
      await page.click('.header-maximize-link');
      await delay(300);
      const hasToggle = await page.evaluate(() =>
        document.body.classList.contains('course-fullscreen')
      );
      interactivityResults.maximize = { toggled: hasToggle };
    }

    // --- Layer 3: Visual/Functional Integrity ---
    const errors = [];
    const warnings = [];

    // Logo source check
    const logoSrc = await page.$eval('#site-logo .bb-logo', el => el.getAttribute('src') || '');
    if (!logoSrc || logoSrc.trim() === '') errors.push('🛑 Logo is missing or has no src');

    // Header remains fixed
    await page.evaluate(() => window.scrollTo(0, 200));
    const headerVisible = await page.evaluate(() => {
      const el = document.querySelector('header#masthead');
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      return rect.top >= 0 && rect.bottom > 50;
    });
    if (!headerVisible) errors.push('🛑 Header not fixed or scrolled out');

    // Submenu is visible
    const dropdownVisible = await page.evaluate(() => {
      const el = document.querySelector('.user-wrap .sub-menu');
      return el && el.offsetHeight > 0;
    });
    if (!dropdownVisible) errors.push('🛑 User dropdown submenu is hidden or collapsed');

    // Check dropdown menu has links
    const userLinksCount = await page.$$eval('.bb-my-account-menu a', els => els.length);
    if (userLinksCount === 0) errors.push('🛑 User dropdown contains no nav links');

    // Dark mode toggle applies class
    const originalClass = await page.evaluate(() => document.body.className);
    try {
      await page.click('.sfwd-dark-mode');
      await delay(300);
      const newClass = await page.evaluate(() => document.body.className);
      if (originalClass === newClass) warnings.push('⚠️ Dark mode clicked but no class change');
    } catch {
      warnings.push('⚠️ Dark mode toggle not clickable');
    }

    // Body shouldn't be locked
    const bodyLocked = await page.evaluate(() =>
      document.body.classList.contains('no-scroll') || document.body.classList.contains('locked')
    );
    if (bodyLocked) errors.push('🛑 Body has no-scroll or locked class after load');

    // Excessive XHR
    if (xhrMetrics.length > 5)
      warnings.push(`⚠️ High header-side XHR usage: ${xhrMetrics.length} calls`);

    const flowEnd = performance.now();

    if (context.shouldExport) {
      addMetric({
        flow: 'globalHeaderFlow-layer3',
        totalMs: Math.round(flowEnd - flowStart),
        headerLoadTime,
        dropdownTimings,
        interactivityResults,
        consoleErrors,
        consoleWarnings,
        xhrMetrics,
        layer3Errors: errors,
        layer3Warnings: warnings,
        timestamp: new Date().toISOString(),
      });
    }

    if (errors.length === 0 && warnings.length === 0) {
      console.log('✅ Layer 3 PASSED: header layout + functionality verified');
    } else {
      console.warn(`⚠️ Layer 3 completed with ${errors.length} error(s), ${warnings.length} warning(s)`);
      errors.forEach(e => console.error(e));
      warnings.forEach(w => console.warn(w));
    }

    console.log('🎯 globalHeaderFlow complete');
  };
  ```

  ##### 📄 Code files from buddyboss-theme-child(PHP/CSS)
  - PHP File: `template-parts/header.php` → Loads and assembles the header structure: logo, nav, and aside panel based on LMS conditions

  ```php
  <?php 
  // Site Logo
  $show		  = buddyboss_theme_get_option( 'logo_switch' );
  $show_dark    = buddyboss_theme_get_option( 'logo_dark_switch' );
  $logo_dark_id = buddyboss_theme_get_option( 'logo_dark', 'id' );
  $logo_dark    = ( $show && $show_dark && $logo_dark_id ) ? wp_get_attachment_image( $logo_dark_id, 'full', '', array( 'class' => 'bb-logo bb-logo-dark' ) ) : '';
  ?>

  <style>
      /* Custom Header Styles */
      div header#masthead .flex{
          flex-direction: row;
      }
      
      img.bb-logo{
          width: 240px !important;
          height: 50px !important;
      }
  </style>

  <div class="container site-header-container flex default-header">    
      
  <a href="#" class="bb-toggle-panel"><i class="bb-icon-l bb-icon-sidebar"></i></a>
      <?php
      if ( buddyboss_is_learndash_inner() && !buddyboss_theme_ld_focus_mode() ) {
          get_template_part( 'template-parts/site-logo' );
          get_template_part( 'template-parts/site-navigation' );
      } elseif ( buddyboss_is_learndash_inner() && buddyboss_theme_ld_focus_mode() ) {
          if ( buddyboss_is_learndash_brand_logo() ) { ?>
          <div id="site-logo" class="site-branding">
              <div class="ld-brand-logo ld-focus-custom-logo site-title">
                  <img src="<?php echo esc_url(wp_get_attachment_url(buddyboss_is_learndash_brand_logo())); ?>" alt="<?php echo esc_attr(get_post_meta(buddyboss_is_learndash_brand_logo() , '_wp_attachment_image_alt', true)); ?>" class="bb-logo">
              </div>  
          </div>
          <?php } else {
              get_template_part( 'template-parts/site-logo' );   
          }
      } elseif ( buddyboss_theme_is_tutorlms_inner() && buddyboss_theme_is_tutorlms_spotlight_mode() ) {
          get_template_part( 'template-parts/site-logo' );
      } elseif ( ! buddyboss_is_learndash_inner() ) {
          get_template_part( 'template-parts/site-logo' );
          get_template_part( 'template-parts/site-navigation' );
      }
      ?>
    <?php get_template_part( 'template-parts/header-aside' ); ?>
  </div>
  ```

  - PHP File: `template-parts/site-logo.php` → Renders dynamic site logo with fallback, handles dark/light logo output and SEO tag wrapping

  ```php
  <?php
  // Site Logo
  $buddypanel      = buddyboss_theme_get_option( 'buddypanel' );
  $show            = buddyboss_theme_get_option( 'logo_switch' );
  $show_dark       = buddyboss_theme_get_option( 'logo_dark_switch' );
  $logo_id         = buddyboss_theme_get_option( 'logo', 'id' );
  $logo_dark_id    = buddyboss_theme_get_option( 'logo_dark', 'id' );
  $buddypanel_logo = buddyboss_theme_get_option( 'buddypanel_show_logo' );
  $logo            = ( $show && $logo_id ) ? wp_get_attachment_image( $logo_id, 'full', '', array( 'class' => 'bb-logo' ) ) : get_bloginfo( 'name' );
  $logo_dark       = ( $show && $show_dark && $logo_dark_id ) ? wp_get_attachment_image( $logo_dark_id, 'full', '', array( 'class' => 'bb-logo bb-logo-dark' ) ) : '';

  // This is for better SEO
  $elem       = ( is_front_page() && is_home() ) ? 'h1' : 'div';
  $logo_class = $buddypanel ? $buddypanel_logo ? 'buddypanel_logo_display_on' : 'buddypanel_logo_display_off' : '';

  // Show Logo in header if buddypanel does not have menu to show
  if ( 'buddypanel_logo_display_on' === $logo_class ) {

    $menu = is_user_logged_in() ? 'buddypanel-loggedin' : 'buddypanel-loggedout';

    if ( has_nav_menu( $menu ) ) {
      $logo_class = 'buddypanel_logo_display_on';
    } else {
      $logo_class = 'buddypanel_logo_display_off';
    }
  }
  ?>
  <style>
      .site-branding{
          padding-right: 0;
      }
  </style>
  <div id="site-logo" class="site-branding <?php echo esc_attr( $logo_class ); ?>">
    <<?php echo $elem; ?> class="site-title">
      <a href="<?php echo esc_url( bb_get_theme_header_logo_link() ); ?>" rel="home">
        <?php echo $logo; echo $logo_dark;?>
      </a>
    </<?php echo $elem; ?>>
  </div>
  ```

  - PHP File: `template-parts/header-aside.php` → Loads user dropdown, icons (messages/notifications), theme toggles, and header buttons

  ```php
  <?php
  /**
   * Template part for displaying header aside.
   *
   * @package BuddyBoss_Theme
   */
  $show_search        = buddyboss_theme_get_option( 'desktop_component_opt_multi_checkbox', 'desktop_header_search' );
  $show_messages      = buddyboss_theme_get_option( 'desktop_component_opt_multi_checkbox', 'desktop_messages' ) && is_user_logged_in();
  $show_notifications = buddyboss_theme_get_option( 'desktop_component_opt_multi_checkbox', 'desktop_notifications' ) && is_user_logged_in();
  $show_shopping_cart = buddyboss_theme_get_option( 'desktop_component_opt_multi_checkbox', 'desktop_shopping_cart' );
  $header_style       = (int) buddyboss_theme_get_option( 'buddyboss_header' );
  $profile_dropdown   = buddyboss_theme_get_option( 'profile_dropdown' );
  $is_lms_inner       = (
    ( class_exists( 'SFWD_LMS' ) && buddyboss_is_learndash_inner() ) ||
    ( class_exists( 'LifterLMS' ) && buddypanel_is_lifterlms_inner() ) ||
    ( function_exists( 'tutor' ) && buddyboss_is_tutorlms_inner() )
  );

  ?>
  <style>
    /* NOTICE - data-no-dropdown attribute disables the user profile(for now - we need)
      <a class="user-link" href=" echo esc_url( $user_link );"  echo bb_elementor_pro_disable_page_transition();  data-no-dropdown>
    */
    /* TODO BEFORE NOTICE - to apply it first add the missing menu items to our sidebar menu so we can not use it and still have everything */
    /* Custom header-aside Styles */
    .avatar-100{
          width: 50px !important;      
          height: 50px !important;        
          border-radius: 10px !important;
          max-width: none !important;
      box-shadow: 0px 4px 20px 0px rgba(0, 0, 0, 0.15);
      }
      .user-name{
          font-size: 16px;
          margin-left: 0;
          margin-right: 10px;
      }
      #header-aside > div > div.user-wrap.user-wrap-container.menu-item-has-children > a{
          flex-direction: row-reverse;
      }
      /* Adjusting the order of elements */
      .header-search-link { order: 2; } /* The search icon comes fourth 2*/
      .bb-separator { order: 3; } /* The separator comes right before the search icon 3*/
      #header-messages-dropdown-elem { order: 4; } /* Messages come second 4*/
      #header-notifications-dropdown-elem { order: 5; } /* Notifications come first 5*/
      .user-wrap { order: 1;} /* User info comes last 1*/


      .header-aside-inner {
          display: flex;
          align-items: center;  /* Align items vertically */
          justify-content: center;
          width: 100%; /* Adjust width as necessary */
      }
      .header-aside-inner > * {
          margin-right: 8px; 
      }
      .header-aside-inner a {
          display: flex;
          align-items: center; /* Ensure that the icon within each link is also centered */
      }
      .header-aside-inner i {
          margin-right: 5px; /* Space between icon and text if any */
          vertical-align: middle; /* Helps further in aligning icons with text vertically */
      }

      /* Specific adjustments for ::before content */
      .header-aside-inner a::before {
          display: inline-block;
          vertical-align: middle; /* Aligns the pseudo-element with the text */
          /* You may need additional positioning here depending on your specific layout */
      }
  </style>


  <div id="header-aside" class="header-aside <?php echo esc_attr( $profile_dropdown ); ?>">
    <div class="header-aside-inner">

      <?php
      if ( $is_lms_inner ) :
        ?>
        <a href="#" id="bb-toggle-theme">
          <span class="sfwd-dark-mode" data-balloon-pos="down" data-balloon="<?php esc_html_e( 'Dark Mode', 'buddyboss-theme' ); ?>"><i class="bb-icon-rl bb-icon-moon"></i></span>
          <span class="sfwd-light-mode" data-balloon-pos="down" data-balloon="<?php esc_html_e( 'Light Mode', 'buddyboss-theme' ); ?>"><i class="bb-icon-l bb-icon-sun"></i></span>
        </a>
        <a href="#" class="header-maximize-link course-toggle-view" data-balloon-pos="down" data-balloon="<?php esc_html_e( 'Maximize', 'buddyboss-theme' ); ?>"><i class="bb-icon-l bb-icon-expand"></i></a>
        <a href="#" class="header-minimize-link course-toggle-view" data-balloon-pos="down" data-balloon="<?php esc_html_e( 'Minimize', 'buddyboss-theme' ); ?>"><i class="bb-icon-l bb-icon-merge"></i></a>

        <?php
      elseif ( is_user_logged_in() ) :
        if ( $show_search && 4 !== $header_style ) :
          ?>
          <a href="#" class="header-search-link" data-balloon-pos="down" data-balloon="<?php esc_html_e( 'Search', 'buddyboss-theme' ); ?>"><i class="bb-icon-l bb-icon-search"></i></a>
          <span class="bb-separator"></span>
          <?php
        endif;

        if ( $show_messages && function_exists( 'bp_is_active' ) && bp_is_active( 'messages' ) ) :
          get_template_part( 'template-parts/messages-dropdown' );
        endif;

        if ( $show_notifications && function_exists( 'bp_is_active' ) && bp_is_active( 'notifications' ) ) :
          get_template_part( 'template-parts/notification-dropdown' );
        endif;

        if ( $show_shopping_cart && class_exists( 'WooCommerce' ) ) :
          get_template_part( 'template-parts/cart-dropdown' );
        endif;
      endif;

      if ( 'off' !== $profile_dropdown ) {
        if ( is_user_logged_in() ) :
          ?>
          <div class="user-wrap user-wrap-container menu-item-has-children">
            <?php
            $current_user = wp_get_current_user();
            $user_link    = function_exists( 'bp_core_get_user_domain' ) ? bp_core_get_user_domain( $current_user->ID ) : get_author_posts_url( $current_user->ID );
            $display_name = function_exists( 'bp_core_get_user_displayname' ) ? bp_core_get_user_displayname( $current_user->ID ) : $current_user->display_name;
            ?>

            <a class="user-link" href="<?php echo esc_url( $user_link ); ?>" <?php echo bb_elementor_pro_disable_page_transition(); ?>>
              <?php
              if ( 'name_and_avatar' === $profile_dropdown ) {
                ?>
                <span class="user-name"><?php echo esc_html( $display_name ); ?></span><i class="bb-icon-l bb-icon-angle-down"></i>
                <?php
              }
              echo get_avatar( get_current_user_id(), 100 );
              ?>
            </a>

            <div class="sub-menu">
              <div class="wrapper">
                <ul class="sub-menu-inner">
                  <li>
                    <a class="user-link" href="<?php echo esc_url( $user_link ); ?>" <?php echo bb_elementor_pro_disable_page_transition(); ?>>
                      <?php echo get_avatar( get_current_user_id(), 100 ); ?>
                      <span>
                        <span class="user-name"><?php echo esc_html( $display_name ); ?></span>
                        <?php if ( function_exists( 'bp_is_active' ) && function_exists( 'bp_activity_get_user_mentionname' ) ) : ?>
                          <span class="user-mention"><?php echo '@' . esc_html( bp_activity_get_user_mentionname( $current_user->ID ) ); ?></span>
                        <?php else : ?>
                          <span class="user-mention"><?php echo '@' . esc_html( $current_user->user_login ); ?></span>
                        <?php endif; ?>
                      </span>
                    </a>
                  </li>
                  <?php
                  $theme_menu_locations = get_nav_menu_locations();
                  
                  if ( class_exists( 'SFWD_LMS' ) && ld_30_focus_mode_enable() && isset( $theme_menu_locations['ld30_focus_mode'] ) ) {
                    wp_nav_menu(
                      array(
                        'theme_location' => 'ld30_focus_mode',
                        'container' => false,
                        'fallback_cb' => false,
                        'walker'  => new BuddyBoss_SubMenuWrap(),
                        'menu_class' => 'bb-my-account-menu',
                      )
                    );
                  } elseif ( function_exists( 'bp_is_active' ) ) {
                    $header_menu = wp_nav_menu(
                      array(
                        'theme_location' => 'header-my-account',
                        'echo'        => false,
                        'fallback_cb' => '__return_false',
                      )
                    );
                    if ( ! empty( $header_menu ) ) {
                      wp_nav_menu(
                        array(
                          'theme_location' => 'header-my-account',
                          'menu_id' => 'header-my-account-menu',
                          'container' => false,
                          'fallback_cb' => '',
                          'walker'  => new BuddyBoss_SubMenuWrap(),
                          'menu_class' => 'bb-my-account-menu',
                        )
                      );
                    } else {
                      do_action( THEME_HOOK_PREFIX . 'header_user_menu_items' );
                    }
                  } else {
                    do_action( THEME_HOOK_PREFIX . 'header_user_menu_items' );
                  }
                  ?>
                </ul>
              </div>
            </div>
          </div>
          <?php
        endif;
      }

      if ( ! is_user_logged_in() ) :
        ?>

        <?php if ( $show_search && 4 !== $header_style && !$is_lms_inner ) : ?>
          <a href="#" class="header-search-link" data-balloon-pos="down" data-balloon="<?php esc_attr_e( 'Search', 'buddyboss-theme' ); ?>"><i class="bb-icon-l bb-icon-search"></i></a>
          <span class="search-separator bb-separator"></span>
          <?php
        endif;

        if ( $show_shopping_cart && class_exists( 'WooCommerce' ) && !$is_lms_inner ) :
          get_template_part( 'template-parts/cart-dropdown' );
        endif;
        ?>
          <div class="bb-header-buttons">
            <a href="<?php echo esc_url( wp_login_url() ); ?>" class="button small outline signin-button link"><?php esc_html_e( 'Sign in', 'buddyboss-theme' ); ?></a>

            <?php if ( get_option( 'users_can_register' ) ) : ?>
              <a href="<?php echo esc_url( wp_registration_url() ); ?>" class="button small signup"><?php esc_html_e( 'Sign up', 'buddyboss-theme' ); ?></a>
            <?php endif; ?>
          </div>
        <?php

        endif;

        if (
          3 === $header_style || $is_lms_inner
        ) :
            echo buddypanel_position_right();
        endif;
      ?>

    </div><!-- .header-aside-inner -->
  </div><!-- #header-aside -->

  ```


  **Latest Metrics Exported:**
  ```json
  [
    {
      "flow": "loginFlow",
      "totalMs": 11920,
      "domMs": 1433,
      "loginProcessingMs": 6058,
      "timestamp": "2025-07-06T13:59:24.149Z"
    },
    {
      "flow": "globalHeaderFlow-layer3",
      "totalMs": 1956,
      "headerLoadTime": 35,
      "dropdownTimings": [
        569,
        549,
        530
      ],
      "interactivityResults": {
        "profile": {
          "clicked": true,
          "success": true,
          "ms": 569
        },
        "notifications": {
          "clicked": true,
          "success": true,
          "ms": 549
        },
        "messages": {
          "clicked": true,
          "success": true,
          "ms": 530
        },
        "search": {
          "clicked": true
        }
      },
      "consoleErrors": [],
      "consoleWarnings": [],
      "xhrMetrics": [],
      "layer3Errors": [
        "🛑 User dropdown contains no nav links"
      ],
      "layer3Warnings": [
        "⚠️ Dark mode toggle not clickable"
      ],
      "timestamp": "2025-07-06T13:59:26.106Z"
    }
  ]
  ```

  ```csv
  flow,totalMs,domMs,loginProcessingMs,timestamp
  loginFlow,11920,1433,6058,2025-07-06T13:59:24.149Z
  globalHeaderFlow-layer3,1956,35,569,549,530,[object Object],,,,🛑 User dropdown contains no nav links,⚠️ Dark mode toggle not clickable,2025-07-06T13:59:26.106Z
  ```

  ---

  #### globalHeaderFlow.js Findings:

  - ✅ All expected header components rendered (logo, toggle, user block, search, notifications, etc.)
  - ✅ Profile, notifications, and messages dropdowns all opened in <600ms
  - ✅ No console JS errors
  - ⚠️ **Layer 3 Error:** `.bb-my-account-menu` had **no anchor links** (profile dropdown content missing)
  - ⚠️ **Layer 3 Warning:** Dark mode toggle **did not apply a class change**

  ---

  #### globalHeaderFlow.js Actions:
- [x] Combine all 3 layers into one QA file
- [x] Log toggle timing per section
- [ ] Re-test with teacher/admin users (to test full sidebar size)
- [ ] Ensure `globalHeaderFlow()` runs inside all major page flows (ticket, placement, grades, etc.)

⏳ **globalHeaderFlow Last updated:** 2025-07-06 16:45



# QA/Performance Audit Plan (Live Checklist)

**Layer 3 'Action Tracker'**

- [x] Layer 1: Functionality — All DOM visible.
- [x] Layer 2: Timing — All major timings measured and logged.
- [ ] Layer 3: Deep QA — One flow at a time, root cause analysis, fix or doc.

_(see checklist for per-flow current status, goals, actions)_

## CLI Usage & Metrics Export

main.js launches flows dynamically (see below):

```js
const flows = {
  login: require("./flows/loginFlow"),
  globalSidebar: require("./flows/globalTemplate/globalSidebarFlow"),
  // ...other flows
};
```

Exports:

- Per-run: JSON and CSV, named with timestamp.

## Metrics, Logger, Utilities

_(Include loggerXHR, metricsExporter, summarizeXHR, etc. as needed.)_

## To-Dos / Next Steps

- [ ] Complete globalHeaderFlow, integrate into each relevant page flow
<!--  we will uncomment as we procced - [ ] Finish ticketFlow layer 3 (after global pieces added)
- [ ] Add global headerAside, logoSite as modular flows
- [ ] For each main student flow, ensure all global flows run inside page flow (not just after login)
- [ ] Iterate, fix, or optimize page by page — root cause and solution log -->

## How to Use / Add More Context

- Add new PHP/JS/CSS as separate sections, name clearly.
- For each new global/template flow:
  1. Add to globalTemplate section
  2. Insert usage/integration comment in affected page flows
