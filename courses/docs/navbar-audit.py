#!/usr/bin/env python3
"""
Generate the Navbar Consistency Audit PDF for AutoNateAI Learning Hub.
Dark mode theme matching the platform design.
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
WARNING = (255, 183, 77)


class AuditPDF(FPDF):
    def header(self):
        self.set_fill_color(*BG_PRIMARY)
        self.rect(0, 0, 210, 18, "F")
        self.set_font("Helvetica", "B", 9)
        self.set_text_color(*ACCENT)
        self.cell(0, 10, "AutoNateAI Learning Hub - Navbar Consistency Audit", ln=True, align="L")
        self.set_draw_color(*ACCENT_DIM)
        self.line(10, 17, 200, 17)
        self.ln(4)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "", 7)
        self.set_text_color(*TEXT_MUTED)
        self.cell(0, 10, f"Page {self.page_no()}/{{nb}}  |  Generated {datetime.now().strftime('%B %d, %Y')}", align="C")

    def dark_page(self):
        self.set_fill_color(*BG_PRIMARY)
        self.rect(0, 0, 210, 297, "F")

    def section_title(self, title):
        self.set_font("Helvetica", "B", 14)
        self.set_text_color(*ACCENT)
        self.cell(0, 10, title, ln=True)
        self.set_draw_color(*ACCENT_DIM)
        self.line(self.l_margin, self.get_y(), 200, self.get_y())
        self.ln(4)

    def sub_title(self, title):
        self.set_font("Helvetica", "B", 11)
        self.set_text_color(*TEXT_PRIMARY)
        self.cell(0, 8, title, ln=True)
        self.ln(2)

    def body_text(self, text):
        self.set_font("Helvetica", "", 9)
        self.set_text_color(*TEXT_SECONDARY)
        self.multi_cell(0, 5, text)
        self.ln(2)

    def bullet(self, text, color=TEXT_SECONDARY):
        self.set_font("Helvetica", "", 9)
        self.set_text_color(*color)
        x = self.get_x()
        self.cell(8, 5, "-")
        self.set_x(x + 8)
        self.multi_cell(0, 5, text)
        self.ln(1)

    def card_start(self):
        self.set_fill_color(*BG_CARD)
        self._card_y = self.get_y()
        self.ln(2)

    def card_end(self):
        y_end = self.get_y()
        self.set_fill_color(*BG_CARD)
        self.rect(self.l_margin - 2, self._card_y, 190, y_end - self._card_y + 4, "F")
        # Re-render text would be complex, so we just draw the bg behind
        self.set_y(y_end + 4)

    def status_badge(self, text, color):
        self.set_font("Helvetica", "B", 8)
        self.set_text_color(*color)
        self.cell(20, 5, text)

    def file_issue(self, filename, severity, issues):
        self.set_fill_color(*BG_CARD)
        y_start = self.get_y()

        # Check if we need a new page
        if y_start > 250:
            self.add_page()
            self.dark_page()
            y_start = self.get_y()

        # File name
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(*TEXT_PRIMARY)
        self.cell(120, 7, filename)

        # Severity badge
        sev_color = DANGER if severity == "HIGH" else WARNING if severity == "MEDIUM" else SUCCESS
        self.set_font("Helvetica", "B", 8)
        self.set_text_color(*sev_color)
        self.cell(0, 7, f"[{severity}]", ln=True)

        # Issues
        for issue in issues:
            self.bullet(issue, TEXT_SECONDARY)

        self.ln(3)
        self.set_draw_color(40, 40, 60)
        self.line(self.l_margin, self.get_y(), 200, self.get_y())
        self.ln(3)


def build_pdf():
    pdf = AuditPDF()
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=20)

    # ── PAGE 1: Title ──
    pdf.add_page()
    pdf.dark_page()
    pdf.ln(30)
    pdf.set_font("Helvetica", "B", 28)
    pdf.set_text_color(*TEXT_PRIMARY)
    pdf.cell(0, 14, "Navbar Consistency Audit", ln=True, align="C")
    pdf.ln(4)
    pdf.set_font("Helvetica", "", 12)
    pdf.set_text_color(*ACCENT)
    pdf.cell(0, 8, "AutoNateAI Learning Hub - Dashboard Sidebar", ln=True, align="C")
    pdf.ln(8)
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(*TEXT_SECONDARY)
    pdf.cell(0, 6, f"Generated: {datetime.now().strftime('%B %d, %Y')}", ln=True, align="C")
    pdf.cell(0, 6, "Branch: new-profile", ln=True, align="C")
    pdf.ln(20)

    # Summary box
    pdf.set_fill_color(*BG_CARD)
    pdf.rect(25, pdf.get_y(), 160, 50, "F")
    y_box = pdf.get_y() + 6
    pdf.set_y(y_box)
    pdf.set_font("Helvetica", "B", 12)
    pdf.set_text_color(*ACCENT)
    pdf.cell(0, 8, "Quick Summary", ln=True, align="C")
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(*TEXT_PRIMARY)
    pdf.cell(0, 7, "12 dashboard pages audited", ln=True, align="C")
    pdf.set_text_color(*DANGER)
    pdf.cell(0, 7, "3 pages with sidebar issues", ln=True, align="C")
    pdf.set_text_color(*WARNING)
    pdf.cell(0, 7, "9 pages missing Basketball Section", ln=True, align="C")
    pdf.ln(20)

    # ── PAGE 2: Gold Standard ──
    pdf.add_page()
    pdf.dark_page()
    pdf.section_title("1. Gold Standard Sidebar (index.html)")
    pdf.body_text(
        "The index.html dashboard page contains the complete and correct sidebar navigation. "
        "All other dashboard pages should match this structure. Below is the expected layout:"
    )
    pdf.ln(2)

    sections = [
        ("Main", [
            ("Dashboard", "index.html"),
            ("Course Library", "courses.html"),
            ("Daily Challenges", "challenges.html"),
        ]),
        ("Learning", [
            ("Progress", "progress.html"),
            ("Achievements", "achievements.html"),
            ("Notes", "notes.html"),
        ]),
        ("Community", [
            ("Feed", "feed.html"),
            ("Discord", "https://discord.gg/Me5N8tCdkC (external)"),
            ("Leaderboard", "leaderboard.html"),
        ]),
        ("Account", [
            ("Profile", "profile.html"),
            ("Settings", "settings.html"),
            ("Sign Out", "# (logout handler)"),
        ]),
        ("Basketball (hidden by default)", [
            ("Play Simulator", "basketball-sim.html"),
        ]),
        ("Admin (hidden by default)", [
            ("Admin Dashboard", "../admin/"),
        ]),
    ]

    for section_name, items in sections:
        pdf.set_fill_color(*BG_CARD)
        y_s = pdf.get_y()
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(*ACCENT)
        pdf.cell(0, 7, f"  {section_name}", ln=True)
        for label, href in items:
            pdf.set_font("Helvetica", "", 9)
            pdf.set_text_color(*TEXT_SECONDARY)
            pdf.cell(0, 5, f"      {label}  ->  {href}", ln=True)
        y_e = pdf.get_y()
        pdf.set_fill_color(*BG_CARD)
        pdf.rect(self_l_margin := 10, y_s - 1, 190, y_e - y_s + 3, "F")
        pdf.set_y(y_e + 4)

    # ── PAGE 3: Consistency Matrix ──
    pdf.add_page()
    pdf.dark_page()
    pdf.section_title("2. Consistency Matrix")
    pdf.body_text(
        "The table below shows which nav items are present on each dashboard page. "
        "A checkmark means the item is present; an X means it is missing."
    )
    pdf.ln(2)

    pages = [
        "index", "courses", "progress", "achievements", "challenges",
        "leaderboard", "notes", "profile", "settings", "feed", "bball-sim"
    ]
    nav_items = [
        "Dashboard", "Courses", "Challenges", "Progress", "Achievements",
        "Notes", "Feed", "Discord", "Leaderboard", "Profile", "Settings", "Basketball"
    ]

    # Matrix data: True = present, False = missing
    matrix = {
        "index":        [True, True, True, True, True, True, True, True, True, True, True, True],
        "courses":      [True, True, True, True, True, True, True, True, True, True, True, False],
        "progress":     [True, True, True, True, True, True, True, True, True, True, True, False],
        "achievements": [True, True, True, True, True, True, True, True, True, True, True, False],
        "challenges":   [True, True, True, True, True, False, True, True, True, True, True, False],
        "leaderboard":  [True, True, True, True, True, True, True, True, True, True, True, False],
        "notes":        [True, True, True, True, True, True, True, True, True, True, True, False],
        "profile":      [True, True, True, True, True, True, True, True, True, True, True, False],
        "settings":     [True, True, True, True, True, True, True, True, True, True, True, False],
        "feed":         [True, True, True, True, True, True, True, True, True, True, True, False],
        "bball-sim":    [True, True, True, False, False, False, False, False, False, True, True, True],
    }

    # Table header
    col_w_page = 22
    col_w = 14.5
    pdf.set_font("Helvetica", "B", 6)
    pdf.set_text_color(*ACCENT)
    pdf.set_fill_color(*BG_CODE)
    pdf.cell(col_w_page, 6, "Page", border=0, fill=True)
    for item in nav_items:
        short = item[:7] if len(item) > 7 else item
        pdf.cell(col_w, 6, short, border=0, fill=True, align="C")
    pdf.ln()

    # Table rows
    for page in pages:
        if pdf.get_y() > 270:
            pdf.add_page()
            pdf.dark_page()

        row_data = matrix[page]
        row_has_issue = any(not v for v in row_data)
        bg = (30, 20, 20) if row_has_issue else BG_CARD
        pdf.set_fill_color(*bg)

        pdf.set_font("Helvetica", "", 7)
        pdf.set_text_color(*TEXT_PRIMARY)
        pdf.cell(col_w_page, 5, page, border=0, fill=True)

        for val in row_data:
            if val:
                pdf.set_text_color(*SUCCESS)
                pdf.cell(col_w, 5, "OK", border=0, fill=True, align="C")
            else:
                pdf.set_text_color(*DANGER)
                pdf.cell(col_w, 5, "MISS", border=0, fill=True, align="C")
        pdf.ln()

    pdf.ln(4)
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(*TEXT_MUTED)
    pdf.cell(0, 5, "Rows highlighted in red contain one or more missing nav items.", ln=True)
    pdf.cell(0, 5, "course.html excluded - standalone viewer with no sidebar.", ln=True)

    # ── PAGE 4: Detailed Issues ──
    pdf.add_page()
    pdf.dark_page()
    pdf.section_title("3. Detailed Issues by File")

    # basketball-sim.html
    pdf.file_issue(
        "basketball-sim.html",
        "HIGH",
        [
            "Missing 6 nav items: Progress, Achievements, Notes, Feed, Discord, Leaderboard",
            "Has only a stripped-down sidebar with Main (3 items), Basketball, Account sections",
            "Missing entire 'Learning' section (Progress, Achievements, Notes)",
            "Missing entire 'Community' section (Feed, Discord, Leaderboard)",
            "Was added from upstream pull with minimal nav - needs full sidebar parity",
        ]
    )

    pdf.file_issue(
        "challenges.html",
        "MEDIUM",
        [
            "Missing 'Notes' link in the Learning section",
            "Learning section only has Progress and Achievements, missing Notes",
            "Missing Basketball Section (hidden by default)",
            "All other nav items are present and correct",
        ]
    )

    pdf.file_issue(
        "Basketball Section (9 pages)",
        "MEDIUM",
        [
            "The Basketball nav section is only present in index.html and basketball-sim.html",
            "Missing from: courses, progress, achievements, challenges, leaderboard, notes, profile, settings, feed",
            "Section is hidden by default (display: none) and shown via JS for qualifying orgs",
            "Should be added to all dashboard pages for consistency with index.html",
            "Section HTML: <div class='nav-section' id='basketball-section' style='display: none;'>",
        ]
    )

    # ── PAGE 5: Fix Instructions ──
    pdf.add_page()
    pdf.dark_page()
    pdf.section_title("4. Recommended Fix Plan")

    pdf.sub_title("Fix 1: basketball-sim.html - Add Full Sidebar")
    pdf.body_text(
        "Replace the stripped-down sidebar nav with the full standard sidebar matching index.html. "
        "Keep the Basketball section visible (not hidden) since this IS the basketball page. "
        "Add the Learning section (Progress, Achievements, Notes) and Community section "
        "(Feed, Discord, Leaderboard) between Main and Account."
    )

    pdf.sub_title("Fix 2: challenges.html - Add Notes Link")
    pdf.body_text(
        "Add the Notes nav item to the Learning section. Currently the Learning section has "
        "Progress and Achievements but is missing Notes. Insert the following after Achievements:"
    )
    pdf.set_fill_color(*BG_CODE)
    pdf.set_font("Courier", "", 8)
    pdf.set_text_color(180, 191, 255)
    code_block = (
        '<li class="nav-item">\n'
        '  <a href="notes.html" class="nav-link">\n'
        '    <span class="nav-icon">NOTEPAD_ICON</span>\n'
        '    <span class="nav-text">Notes</span>\n'
        '  </a>\n'
        '</li>'
    )
    pdf.multi_cell(0, 4, code_block, fill=True)
    pdf.ln(4)

    pdf.sub_title("Fix 3: Add Basketball Section to 9 Pages")
    pdf.body_text(
        "Add the hidden Basketball section to all pages that are missing it. "
        "Insert it between the Account section closing </div> and the Admin section. "
        "Pages to update: courses, progress, achievements, challenges, leaderboard, notes, "
        "profile, settings, feed."
    )
    pdf.set_fill_color(*BG_CODE)
    pdf.set_font("Courier", "", 8)
    pdf.set_text_color(180, 191, 255)
    bball_code = (
        '<!-- Basketball Section (hidden) -->\n'
        '<div class="nav-section" id="basketball-section"\n'
        '     style="display: none;">\n'
        '  <span class="nav-section-title"\n'
        '        style="color: #ef4444;">Basketball</span>\n'
        '  <ul class="nav-list">\n'
        '    <li class="nav-item">\n'
        '      <a href="basketball-sim.html"\n'
        '         class="nav-link">\n'
        '        <span class="nav-icon">BBALL_ICON</span>\n'
        '        <span class="nav-text">Play Simulator</span>\n'
        '      </a>\n'
        '    </li>\n'
        '  </ul>\n'
        '</div>'
    )
    pdf.multi_cell(0, 4, bball_code, fill=True)
    pdf.ln(4)

    # ── PAGE 6: Future Recommendation ──
    pdf.add_page()
    pdf.dark_page()
    pdf.section_title("5. Future Recommendation: Shared Sidebar Component")

    pdf.body_text(
        "Currently each dashboard page has the sidebar HTML duplicated inline. This means "
        "any nav change must be replicated across 11+ files, which is error-prone and caused "
        "the inconsistencies documented in this audit."
    )
    pdf.ln(2)

    pdf.sub_title("Option A: JavaScript Include")
    pdf.body_text(
        "Create a shared sidebar.js that injects the sidebar HTML into a placeholder div on each "
        "page. This eliminates duplication entirely - one file to update for all pages. "
        "The script can accept a parameter for which page is 'active' to highlight the current nav item."
    )

    pdf.sub_title("Option B: Server-Side Include / Build Step")
    pdf.body_text(
        "If moving to a build system or server-rendered setup, use partials or includes to "
        "share the sidebar template across all pages."
    )

    pdf.sub_title("Option C: Web Component")
    pdf.body_text(
        "Create a <dashboard-sidebar> custom element that encapsulates all sidebar logic and "
        "markup. Each page just includes <dashboard-sidebar active='feed'></dashboard-sidebar>."
    )

    pdf.ln(4)
    pdf.set_fill_color(*BG_CARD)
    y_note = pdf.get_y()
    pdf.rect(10, y_note, 190, 24, "F")
    pdf.set_y(y_note + 4)
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(*WARNING)
    pdf.cell(0, 6, "  NOTE", ln=True)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*TEXT_SECONDARY)
    pdf.cell(0, 5, "  Implementing a shared sidebar component would prevent future inconsistencies", ln=True)
    pdf.cell(0, 5, "  and reduce maintenance overhead as new pages and sections are added.", ln=True)

    # ── Output ──
    output_path = "/Users/mymac/Documents/Code/swe-hackers/courses/docs/Navbar-Consistency-Audit.pdf"
    pdf.output(output_path)
    print(f"PDF generated: {output_path}")


if __name__ == "__main__":
    build_pdf()
