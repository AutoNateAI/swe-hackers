#!/usr/bin/env python3
"""
Generate the Feed & Post Management Feature Breakdown PDF for AutoNateAI Learning Hub.
Dark mode theme matching the platform's glass-card morphism design.
Re-run this script anytime to regenerate the PDF with the latest content.
"""

from fpdf import FPDF
from datetime import datetime

# Dark theme colors
BG_PRIMARY = (10, 10, 15)
BG_CARD = (22, 22, 42)
BG_CODE = (16, 16, 30)
TEXT_PRIMARY = (232, 232, 240)
TEXT_SECONDARY = (160, 160, 184)
TEXT_MUTED = (106, 106, 128)
ACCENT = (121, 134, 203)
ACCENT_DIM = (80, 90, 150)
SUCCESS = (102, 187, 106)
DANGER = (239, 83, 80)
CODE_TEXT = (180, 191, 255)


class FeaturePDF(FPDF):
    def header(self):
        # Dark background for header area
        self.set_fill_color(*BG_PRIMARY)
        self.rect(0, 0, 210, 18, "F")
        self.set_font("Helvetica", "B", 9)
        self.set_text_color(*TEXT_MUTED)
        self.set_y(5)
        self.cell(0, 8, "AutoNateAI Learning Hub  |  Feed & Post Management Feature Breakdown", align="L")
        self.set_draw_color(*ACCENT)
        self.set_line_width(0.4)
        self.line(10, 16, 200, 16)
        self.ln(12)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 7.5)
        self.set_text_color(*TEXT_MUTED)
        self.cell(0, 10, f"Page {self.page_no()}/{{nb}}  |  Generated {datetime.now().strftime('%B %d, %Y %I:%M %p')}  |  CONFIDENTIAL", align="C")

    def dark_bg(self):
        """Fill page with dark background."""
        self.set_fill_color(*BG_PRIMARY)
        self.rect(0, 0, 210, 297, "F")

    def section_title(self, title):
        self.set_font("Helvetica", "B", 14)
        self.set_text_color(*TEXT_PRIMARY)
        self.ln(4)
        self.cell(0, 10, title, new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(*ACCENT)
        self.set_line_width(0.4)
        self.line(10, self.get_y(), 85, self.get_y())
        self.ln(4)

    def sub_title(self, title):
        self.set_font("Helvetica", "B", 11)
        self.set_text_color(*ACCENT)
        self.ln(2)
        self.cell(0, 8, title, new_x="LMARGIN", new_y="NEXT")
        self.ln(1)

    def body_text(self, text):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(*TEXT_SECONDARY)
        self.multi_cell(0, 5.5, text)
        self.ln(2)

    def bullet(self, text, indent=15):
        x = self.get_x()
        self.set_font("Helvetica", "", 10)
        self.set_text_color(*TEXT_SECONDARY)
        self.set_x(x + indent)
        self.set_text_color(*ACCENT)
        self.cell(6, 5.5, ">")
        self.set_text_color(*TEXT_SECONDARY)
        self.multi_cell(0, 5.5, text)
        self.ln(1)

    def code_block(self, text):
        self.set_font("Courier", "", 8.5)
        self.set_fill_color(*BG_CODE)
        self.set_text_color(*CODE_TEXT)
        # Draw rounded-ish code block
        y_start = self.get_y()
        self.set_x(15)
        self.multi_cell(180, 4.5, text, fill=True)
        self.ln(3)

    def status_badge(self, label, status):
        self.set_font("Helvetica", "B", 9)
        if status == "complete":
            self.set_text_color(*SUCCESS)
            badge = "[COMPLETE]"
        elif status == "in-progress":
            self.set_text_color(255, 183, 77)
            badge = "[IN PROGRESS]"
        else:
            self.set_text_color(*TEXT_MUTED)
            badge = "[PLANNED]"
        self.cell(0, 6, f"  {label}  {badge}", new_x="LMARGIN", new_y="NEXT")
        self.ln(1)

    def card_start(self):
        """Draw a subtle card background."""
        self.set_fill_color(*BG_CARD)

    def card_end(self):
        pass


def build_pdf():
    pdf = FeaturePDF()
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=20)

    # ============================================================
    # COVER / TITLE PAGE
    # ============================================================
    pdf.add_page()
    pdf.dark_bg()
    pdf.ln(35)

    # Accent line above title
    pdf.set_draw_color(*ACCENT)
    pdf.set_line_width(2)
    pdf.line(40, pdf.get_y(), 170, pdf.get_y())
    pdf.ln(8)

    pdf.set_font("Helvetica", "B", 30)
    pdf.set_text_color(*TEXT_PRIMARY)
    pdf.cell(0, 14, "Feed & Post Management", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 14, "Feature Breakdown", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(6)

    # Accent line below title
    pdf.set_line_width(0.5)
    pdf.line(70, pdf.get_y(), 140, pdf.get_y())
    pdf.ln(10)

    pdf.set_font("Helvetica", "", 12)
    pdf.set_text_color(*ACCENT)
    pdf.cell(0, 8, "AutoNateAI Learning Hub", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(*TEXT_SECONDARY)
    pdf.cell(0, 8, f"Last Updated: {datetime.now().strftime('%B %d, %Y')}", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)
    pdf.set_font("Helvetica", "I", 9)
    pdf.set_text_color(*TEXT_MUTED)
    pdf.cell(0, 8, "Version 1.0  |  Status: In Development", align="C", new_x="LMARGIN", new_y="NEXT")

    pdf.ln(30)

    # Purpose card
    pdf.set_fill_color(*BG_CARD)
    y = pdf.get_y()
    pdf.rect(15, y, 180, 38, "F")
    pdf.set_xy(20, y + 4)
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(*ACCENT)
    pdf.cell(0, 6, "Document Purpose", new_x="LMARGIN", new_y="NEXT")
    pdf.set_x(20)
    pdf.set_font("Helvetica", "", 9.5)
    pdf.set_text_color(*TEXT_SECONDARY)
    pdf.multi_cell(170, 5,
        "This document provides a comprehensive technical and product breakdown of the Feed & Post "
        "Management features being built for the AutoNateAI Learning Hub. It covers the architecture, "
        "user experience decisions, file-level changes, and the rationale for how each piece is "
        "tailored specifically for a coding education platform rather than a generic social feed."
    )

    # ============================================================
    # TABLE OF CONTENTS
    # ============================================================
    pdf.add_page()
    pdf.dark_bg()
    pdf.section_title("Table of Contents")
    toc = [
        "1.  Executive Summary",
        "2.  Why a Social Feed for AutoNateAI?",
        "3.  Feature Overview & Status",
        "4.  Post Card 3-Dot Menu - Architecture",
        "5.  Feed & Post Settings - Architecture",
        "6.  File Change Map",
        "7.  Data Model & Firestore Schema",
        "8.  UI/UX Design Decisions",
        "9.  Security Considerations",
        "10. Rollout Checklist",
    ]
    for item in toc:
        pdf.set_font("Helvetica", "", 11)
        pdf.set_text_color(*TEXT_PRIMARY)
        # Draw a subtle dot leader
        pdf.set_draw_color(40, 40, 60)
        y = pdf.get_y() + 6
        pdf.line(15, y, 195, y)
        pdf.cell(0, 9, f"  {item}", new_x="LMARGIN", new_y="NEXT")

    # ============================================================
    # 1. EXECUTIVE SUMMARY
    # ============================================================
    pdf.add_page()
    pdf.dark_bg()
    pdf.section_title("1. Executive Summary")
    pdf.body_text(
        "The Feed & Post Management update introduces two major capabilities to the AutoNateAI "
        "Learning Hub social feed:"
    )
    pdf.bullet(
        "Post Actions Menu: A traditional 3-dot dropdown on every post card giving users "
        "contextual actions - Edit and Delete for their own posts, plus Copy Link, Report, "
        "and Mute Author for community moderation."
    )
    pdf.bullet(
        "Feed & Post Settings: A new section in the Settings page allowing users to configure "
        "their feed experience - display preferences, post defaults, and feed privacy controls."
    )
    pdf.body_text(
        "Both features follow the platform's existing glass-card morphism design language and are "
        "built with the same Firebase + vanilla JS service architecture used across the dashboard. "
        "Settings auto-save to Firestore with debounced writes, and the post menu uses event "
        "delegation for reliable behavior across dynamically rendered content."
    )

    # ============================================================
    # 2. WHY A SOCIAL FEED FOR AUTONATEAI?
    # ============================================================
    pdf.add_page()
    pdf.dark_bg()
    pdf.section_title("2. Why a Social Feed for AutoNateAI?")
    pdf.body_text(
        "AutoNateAI is not a generic social platform - it is a coding education hub. The feed "
        "and post management features are purpose-built to serve learners, not casual social users. "
        "Here is why each piece matters for this specific context:"
    )

    pdf.sub_title("Learning Through Sharing")
    pdf.body_text(
        "When students share code snippets, project showcases, and milestone achievements on the "
        "feed, they reinforce their own learning through articulation. The ability to edit posts "
        "lets them refine their explanations - a core learning behavior. Unlike Twitter or "
        "Instagram where posts are throwaway, learning content benefits from iteration."
    )

    pdf.sub_title("Safe Learning Environment")
    pdf.body_text(
        "The Report and Mute features are critical for maintaining a safe educational space. "
        "Coding communities can attract spam, off-topic content, or discouraging comments. "
        "Giving learners control over what they see keeps the feed focused on growth. The "
        "Mute Author feature is especially important - it lets a student quietly filter out "
        "content that is not relevant to their learning journey without confrontation."
    )

    pdf.sub_title("Ownership and Accountability")
    pdf.body_text(
        "Delete Post gives students agency over their content. A beginner might post code they "
        "later realize has issues - the ability to remove it reduces anxiety around sharing early "
        "work. This lowers the barrier to participation, which is essential for a learning "
        "community where many users are posting code for the first time."
    )

    pdf.sub_title("Personalized Feed Experience")
    pdf.body_text(
        "The Feed Settings in the Settings page let users tailor the feed to their learning style. "
        "Some learners prefer seeing trending community content for inspiration; others want to "
        "follow specific peers working on similar courses. The Show Code Snippets toggle is "
        "AutoNateAI-specific - it lets users who are on mobile or prefer prose-only content "
        "collapse inline code blocks for a cleaner reading experience."
    )

    pdf.sub_title("Privacy for Learners")
    pdf.body_text(
        "Many AutoNateAI users are career changers or beginners who may not want their learning "
        "activity publicly visible. The Feed Privacy settings (Public Profile, Show in Leaderboard, "
        "Allow Mentions) give users control over their visibility. This is especially important "
        "for users from partner organizations like Endless Opportunities Foundation, where "
        "participants may prefer to learn privately."
    )

    # ============================================================
    # 3. FEATURE OVERVIEW & STATUS
    # ============================================================
    pdf.add_page()
    pdf.dark_bg()
    pdf.section_title("3. Feature Overview & Status")

    pdf.sub_title("Post Card 3-Dot Dropdown Menu")
    pdf.status_badge("HTML Template & Conditional Rendering", "complete")
    pdf.status_badge("CSS Styling (Dark + Light Theme)", "complete")
    pdf.status_badge("Event Delegation Click Handling", "complete")
    pdf.status_badge("Edit Post Modal (create, populate, save)", "complete")
    pdf.status_badge("Delete Post (confirm, remove, Firestore sync)", "complete")
    pdf.status_badge("Copy Link to Clipboard", "complete")
    pdf.status_badge("Report Post (toast feedback)", "complete")
    pdf.status_badge("Mute Author (toast feedback)", "complete")
    pdf.status_badge("Firestore-backed mute/report persistence", "planned")

    pdf.ln(4)
    pdf.sub_title("Feed & Post Settings (Settings Page)")
    pdf.status_badge("Feed Preferences UI (3 controls)", "complete")
    pdf.status_badge("Post Defaults UI (3 controls)", "complete")
    pdf.status_badge("Feed Privacy UI (3 controls)", "complete")
    pdf.status_badge("Load settings from Firestore", "complete")
    pdf.status_badge("Auto-save with debounce to Firestore", "complete")
    pdf.status_badge("Feed page reads settings on load", "planned")

    # ============================================================
    # 4. POST CARD 3-DOT MENU - ARCHITECTURE
    # ============================================================
    pdf.add_page()
    pdf.dark_bg()
    pdf.section_title("4. Post Card 3-Dot Menu - Architecture")

    pdf.sub_title("Template Structure")
    pdf.body_text(
        "The dropdown menu is rendered inside each post card as part of the renderPostCard() "
        "template literal in feed.html. It uses conditional rendering based on post ownership:"
    )
    pdf.code_block(
        '<div class="post-card__menu-wrapper">\n'
        '  <button class="post-card__menu-btn">...</button>\n'
        '  <div class="post-card__dropdown" id="dropdown-{postId}">\n'
        '    // Owner-only: Edit Post, Delete Post, divider\n'
        '    // All users: Copy Link, Report Post\n'
        '    // Non-owner only: Mute Author\n'
        '  </div>\n'
        '</div>'
    )
    pdf.body_text(
        "The conditional logic compares post.authorId against this.currentUser?.uid. When the "
        "logged-in user owns the post, they see Edit and Delete at the top with a divider. "
        "Copy Link and Report always appear. Mute Author only shows on other users' posts since "
        "muting yourself is not meaningful."
    )

    pdf.sub_title("CSS Visibility Strategy")
    pdf.body_text(
        "The dropdown uses display:none by default and display:block when the .show class is "
        "added. This was chosen over an opacity-based approach because opacity:0 with "
        "pointer-events:none was found to still render child elements visually in some "
        "configurations. The display:none approach completely removes elements from the render tree."
    )
    pdf.code_block(
        '.post-card__dropdown {\n'
        '  display: none;            /* Hidden by default */\n'
        '  position: absolute;       /* Relative to wrapper */\n'
        '  top: 100%; right: 0;\n'
        '  min-width: 180px;\n'
        '  z-index: 100;\n'
        '}\n'
        '.post-card__dropdown.show {\n'
        '  display: block;           /* Visible when toggled */\n'
        '}'
    )

    pdf.sub_title("Event Delegation Pattern")
    pdf.body_text(
        "Rather than binding click handlers to each individual menu button and dropdown item "
        "(which breaks when posts are dynamically re-rendered), the implementation uses "
        "event delegation on the feed container (#feed-posts). A single click listener uses "
        ".closest() to determine which element was clicked:"
    )
    pdf.code_block(
        'feedContainer.addEventListener("click", (e) => {\n'
        '  const menuBtn = e.target.closest(".post-card__menu-btn");\n'
        '  if (menuBtn) { /* toggle dropdown */ return; }\n'
        '\n'
        '  const item = e.target.closest(".post-card__dropdown-item");\n'
        '  if (item) { /* dispatch action */ return; }\n'
        '});'
    )
    pdf.body_text(
        "This pattern is essential because FeedPage.renderPosts() re-renders the entire post list, "
        "destroying and recreating DOM elements. Event delegation survives re-renders automatically."
    )

    pdf.sub_title("Edit Post Flow")
    pdf.body_text(
        "1. User clicks Edit Post in the dropdown.\n"
        "2. handleMenuAction dispatches to openEditPost(postId).\n"
        "3. A modal overlay is created (or reused if already exists) with a textarea.\n"
        "4. The textarea is populated with the post's current body text.\n"
        "5. On save: local posts array updated optimistically, FeedService.updatePost() "
        "writes to Firestore, renderPosts() refreshes the UI.\n"
        "6. The save button is cloned before rebinding to prevent duplicate listeners."
    )

    pdf.sub_title("Delete Post Flow")
    pdf.body_text(
        "1. User clicks Delete Post in the dropdown.\n"
        "2. A native confirm() dialog asks for confirmation.\n"
        "3. On confirm: post removed from local array, renderPosts() refreshes UI, "
        "FeedService.deletePost() removes it from Firestore asynchronously.\n"
        "4. A toast notification confirms the deletion."
    )

    # ============================================================
    # 5. FEED & POST SETTINGS - ARCHITECTURE
    # ============================================================
    pdf.add_page()
    pdf.dark_bg()
    pdf.section_title("5. Feed & Post Settings - Architecture")

    pdf.sub_title("Settings Page Layout")
    pdf.body_text(
        "The Feed & Posts section is added to settings.html as the fourth section, after Account "
        "Settings, Notification Preferences, and Appearance. It uses the same glass-card design "
        "pattern and is split into three cards within a two-column grid:"
    )
    pdf.bullet("Feed Preferences (left): Show Code Snippets, Auto-play Milestones, Default Feed View")
    pdf.bullet("Post Defaults (right): Default Post Type, Allow Comments, Show Activity Status")
    pdf.bullet("Feed Privacy (full width): Public Profile, Show in Leaderboard, Allow Mentions")

    pdf.sub_title("Settings Controls")
    pdf.body_text("The following 9 controls are available:")

    controls = [
        ("feed-show-code", "Toggle", "Show/hide inline code blocks in feed posts", "true"),
        ("feed-autoplay-milestones", "Toggle", "Auto-play milestone achievement animations", "true"),
        ("feed-default-view", "Select", "Default tab: Trending / Latest / Following", "trending"),
        ("post-default-type", "Select", "Pre-selected post type when composing", "status"),
        ("post-allow-comments", "Toggle", "Allow comments on your posts by default", "true"),
        ("post-show-activity", "Toggle", "Show online/active status to other users", "true"),
        ("privacy-public-profile", "Toggle", "Allow anyone to view your profile and posts", "true"),
        ("privacy-show-leaderboard", "Toggle", "Include your stats on the leaderboard", "true"),
        ("privacy-allow-mentions", "Toggle", "Let others tag you with @mention", "true"),
    ]
    for ctrl_id, ctrl_type, desc, default in controls:
        pdf.set_font("Courier", "B", 8.5)
        pdf.set_text_color(*CODE_TEXT)
        pdf.cell(0, 5, f"  #{ctrl_id}  ({ctrl_type}, default: {default})", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(*TEXT_MUTED)
        pdf.cell(0, 5, f"     {desc}", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(1)

    pdf.sub_title("Load / Save Architecture")
    pdf.body_text(
        "Settings are loaded from and saved to the Firestore user document under a settings map. "
        "The SettingsPage controller has two methods:"
    )
    pdf.code_block(
        "loadFeedSettings()\n"
        "  - Reads users/{uid} document from Firestore\n"
        "  - Extracts doc.data().settings.* fields\n"
        "  - Populates each toggle/select with stored value or default\n"
        "\n"
        "setupFeedSettingsSave()\n"
        "  - Attaches 'change' listener to all 9 controls\n"
        "  - Debounces writes by 500ms\n"
        "  - Writes all 9 values as dot-notation keys\n"
        "  - Shows a toast notification on save"
    )

    # ============================================================
    # 6. FILE CHANGE MAP
    # ============================================================
    pdf.add_page()
    pdf.dark_bg()
    pdf.section_title("6. File Change Map")
    pdf.body_text(
        "The following files were modified to implement this feature set:"
    )

    files = [
        ("courses/dashboard/feed.html", "MODIFIED", [
            "Post card template: Added .post-card__menu-wrapper with conditional dropdown",
            "bindPostInteractions(): Replaced per-element listeners with event delegation",
            "Added handleMenuAction() dispatcher for edit/delete/copy-link/report/mute",
            "Added openEditPost() with modal creation, textarea, optimistic save",
            "Added confirmDeletePost() with confirm dialog, local removal, Firestore delete",
        ]),
        ("courses/shared/css/feed.css", "MODIFIED", [
            "Added .post-card__menu-wrapper, .post-card__dropdown (display:none/block)",
            "Added .post-card__dropdown-item with hover states and --danger variant",
            "Added .post-edit-overlay and .post-edit-modal styles",
            "Added [data-theme='light'] variants for dropdown and edit modal",
        ]),
        ("courses/dashboard/settings.html", "MODIFIED", [
            "Added Feed & Posts section with 3 glass-cards",
            "Added 9 controls: 6 toggles + 3 selects with descriptions",
            "Added loadFeedSettings() and setupFeedSettingsSave() to controller",
        ]),
    ]

    sidebar_files = [
        "index.html", "courses.html", "challenges.html", "progress.html",
        "achievements.html", "notes.html", "leaderboard.html",
    ]

    for filepath, status, changes in files:
        pdf.set_font("Courier", "B", 9)
        pdf.set_text_color(*ACCENT)
        pdf.cell(0, 7, f"  {filepath}", new_x="LMARGIN", new_y="NEXT")
        for change in changes:
            pdf.bullet(change, indent=10)
        pdf.ln(2)

    # Sidebar files grouped
    pdf.set_font("Courier", "B", 9)
    pdf.set_text_color(*ACCENT)
    pdf.cell(0, 7, "  courses/dashboard/{8 sidebar pages}", new_x="LMARGIN", new_y="NEXT")
    pdf.bullet("Added Settings sidebar link to: " + ", ".join(sidebar_files), indent=10)

    # ============================================================
    # 7. DATA MODEL & FIRESTORE SCHEMA
    # ============================================================
    pdf.add_page()
    pdf.dark_bg()
    pdf.section_title("7. Data Model & Firestore Schema")

    pdf.sub_title("User Settings (users/{uid})")
    pdf.body_text(
        "All feed and post settings are stored as flat keys under the settings map in the user "
        "document. This avoids subcollection overhead and allows atomic updates with "
        "dot-notation field paths."
    )
    pdf.code_block(
        'users/{uid}: {\n'
        '  displayName: "...",\n'
        '  email: "...",\n'
        '  settings: {\n'
        '    // Existing\n'
        '    theme: "dark",\n'
        '    fontSize: "medium",\n'
        '    accentColor: "#7986cb",\n'
        '\n'
        '    // NEW - Feed Preferences\n'
        '    feedShowCode: true,\n'
        '    feedAutoplayMilestones: true,\n'
        '    feedDefaultView: "trending",\n'
        '\n'
        '    // NEW - Post Defaults\n'
        '    postDefaultType: "status",\n'
        '    postAllowComments: true,\n'
        '    postShowActivity: true,\n'
        '\n'
        '    // NEW - Feed Privacy\n'
        '    privacyPublicProfile: true,\n'
        '    privacyShowLeaderboard: true,\n'
        '    privacyAllowMentions: true\n'
        '  }\n'
        '}'
    )

    pdf.sub_title("Feed Posts (feedPosts/{postId})")
    pdf.body_text("Post documents support the edit and delete actions:")
    pdf.code_block(
        'feedPosts/{postId}: {\n'
        '  authorId: "uid",          // Ownership check\n'
        '  authorName: "...",\n'
        '  bodyJson: {\n'
        '    format: "plaintext",\n'
        '    content: "..."          // Updated by Edit Post\n'
        '  },\n'
        '  type: "status",\n'
        '  createdAt: Timestamp,\n'
        '  updatedAt: Timestamp      // Set on edit\n'
        '}\n'
        '\n'
        '// Delete removes the entire document via\n'
        '// FeedService.deletePost(postId)'
    )

    # ============================================================
    # 8. UI/UX DESIGN DECISIONS
    # ============================================================
    pdf.add_page()
    pdf.dark_bg()
    pdf.section_title("8. UI/UX Design Decisions")

    pdf.sub_title("Why display:none Over opacity:0")
    pdf.body_text(
        "The initial implementation used opacity:0 with pointer-events:none to hide the dropdown, "
        "with a CSS transition for a smooth fade-in. However, testing revealed that in certain "
        "caching scenarios, the child button elements remained visually rendered - appearing as "
        "raw unstyled text next to the 3-dot button. Switching to display:none/display:block "
        "completely removes elements from the render tree. The trade-off is losing the fade "
        "animation, but reliability wins."
    )

    pdf.sub_title("Why Event Delegation for the Menu")
    pdf.body_text(
        "The feed uses renderPosts() which replaces innerHTML of the posts container. "
        "Directly-bound click handlers are destroyed on re-render. Event delegation on the "
        "parent container (#feed-posts) survives re-renders, which is critical because "
        "editing or deleting a post triggers renderPosts()."
    )

    pdf.sub_title("Why Auto-Save for Settings")
    pdf.body_text(
        "Feed settings use the same auto-save pattern as Notification Preferences. "
        "When a user toggles a switch or changes a select, a 500ms debounced write sends "
        "all 9 values to Firestore. This matches the existing UX, toggle switches imply "
        "immediate effect, and it reduces friction for multi-setting adjustments."
    )

    pdf.sub_title("Contextual Menu Items")
    pdf.body_text(
        "The dropdown adapts based on post ownership:\n\n"
        "Your posts:    Edit Post | Delete Post | --- | Copy Link | Report Post\n"
        "Others' posts: Copy Link | Report Post | Mute Author\n\n"
        "Edit and Delete only appear on your own posts. Mute Author only appears on "
        "others' posts. Copy Link and Report are universal. The divider separates "
        "destructive actions from informational ones."
    )

    # ============================================================
    # 9. SECURITY CONSIDERATIONS
    # ============================================================
    pdf.add_page()
    pdf.dark_bg()
    pdf.section_title("9. Security Considerations")

    pdf.sub_title("Client-Side Ownership Check")
    pdf.body_text(
        "The menu template uses post.authorId === this.currentUser?.uid to determine which items "
        "to render. This is a UI convenience only - not a security boundary. True enforcement "
        "must happen in Firestore Security Rules:"
    )
    pdf.code_block(
        'match /feedPosts/{postId} {\n'
        '  allow update, delete:\n'
        '    if request.auth.uid == resource.data.authorId;\n'
        '  allow read:\n'
        '    if request.auth != null;\n'
        '  allow create:\n'
        '    if request.auth != null\n'
        '    && request.resource.data.authorId == request.auth.uid;\n'
        '}'
    )

    pdf.sub_title("XSS Prevention in Edit Flow")
    pdf.body_text(
        "When a user edits a post, the content is placed into a textarea element (which does not "
        "render HTML) and saved as plaintext. The renderPostCard template uses escapeHtml() on "
        "user-generated content to prevent script injection."
    )

    pdf.sub_title("Privacy Settings Are Advisory")
    pdf.body_text(
        "The Feed Privacy toggles are currently client-side preferences stored in Firestore. "
        "For them to be enforced, the feed query logic and leaderboard page must read these "
        "settings and filter accordingly. This is a planned follow-up. Until enforced "
        "server-side, these settings represent user intent but are not technically binding."
    )

    # ============================================================
    # 10. ROLLOUT CHECKLIST
    # ============================================================
    pdf.add_page()
    pdf.dark_bg()
    pdf.section_title("10. Rollout Checklist")

    pdf.body_text("Items to complete before this feature is considered production-ready:")
    pdf.ln(2)

    checklist = [
        ("Post 3-dot dropdown renders correctly (dark theme)", True),
        ("Post 3-dot dropdown renders correctly (light theme)", True),
        ("Edit Post modal opens, populates, and saves", True),
        ("Delete Post confirms and removes post", True),
        ("Copy Link copies URL to clipboard", True),
        ("Report Post shows feedback toast", True),
        ("Mute Author shows feedback toast", True),
        ("Dropdown closes on outside click", True),
        ("Event delegation survives post re-render", True),
        ("Feed Settings UI renders in Settings page", True),
        ("Feed Settings load from Firestore on page load", True),
        ("Feed Settings auto-save to Firestore on change", True),
        ("Settings sidebar link added to all dashboard pages", True),
        ("Feed page reads user settings on load", False),
        ("Firestore Security Rules enforce post ownership", False),
        ("Report/Mute persist to Firestore collections", False),
        ("Privacy settings enforced in feed queries", False),
        ("End-to-end testing with multiple user accounts", False),
    ]

    for label, done in checklist:
        if done:
            pdf.set_text_color(*SUCCESS)
            check = "[x]"
        else:
            pdf.set_text_color(*DANGER)
            check = "[ ]"
        pdf.set_font("Courier", "B", 9.5)
        pdf.cell(10, 6, check)
        pdf.set_font("Helvetica", "", 10)
        pdf.set_text_color(*TEXT_SECONDARY)
        pdf.cell(0, 6, label, new_x="LMARGIN", new_y="NEXT")

    # ============================================================
    # OUTPUT
    # ============================================================
    output_path = "/Users/mymac/Documents/Code/swe-hackers/courses/docs/Feed-Post-Management-Breakdown.pdf"
    pdf.output(output_path)
    print(f"PDF generated: {output_path}")
    return output_path


if __name__ == "__main__":
    build_pdf()
