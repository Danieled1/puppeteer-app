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