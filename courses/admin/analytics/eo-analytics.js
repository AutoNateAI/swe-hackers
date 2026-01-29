/**
 * Endless Opportunities Analytics
 *
 * Data fetching and chart rendering for the EO admin analytics dashboard.
 * All charts are hand-built SVG/DOM — no external charting libraries.
 */

const EOAnalytics = (() => {

  const WEEKS = [
    { id: 'week0-intro', name: 'Week 0: Intro' },
    { id: 'week1-questions', name: 'Week 1: Questions' },
    { id: 'week2-data', name: 'Week 2: Data' },
    { id: 'week3-building', name: 'Week 3: Building' },
    { id: 'week4-portfolio', name: 'Week 4: Portfolio' },
  ];

  const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#22d3ee', '#f97316', '#84cc16'];

  // ─── Data Fetching ────────────────────────────────────────

  async function fetchAllData() {
    const db = window.FirebaseApp.getDb();

    // 1. Get all EO users
    const usersSnap = await db.collection('users')
      .where('organizationAccess', 'array-contains', 'endless-opportunities')
      .get();

    const users = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // 2. For each user, fetch attempts + courseProgress in parallel
    const userData = await Promise.all(users.map(async (user) => {
      const [attemptsSnap, progressDoc] = await Promise.all([
        db.collection('users').doc(user.id)
          .collection('activityAttempts')
          .where('courseId', '==', 'endless-opportunities')
          .get(),
        db.collection('users').doc(user.id)
          .collection('courseProgress')
          .doc('endless-opportunities')
          .get()
      ]);

      const attempts = attemptsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const progress = progressDoc.exists ? progressDoc.data() : null;

      return { user, attempts, progress };
    }));

    return aggregate(userData);
  }

  // ─── Aggregation ──────────────────────────────────────────

  function aggregate(userData) {
    const allAttempts = [];
    const studentRows = [];

    userData.forEach(({ user, attempts, progress }) => {
      allAttempts.push(...attempts);

      const totalAttempts = attempts.length;
      const correctCount = attempts.filter(a => a.correct).length;
      const accuracy = totalAttempts > 0 ? correctCount / totalAttempts : 0;
      const lessonsWithAttempts = new Set(attempts.map(a => a.lessonId)).size;

      // Find last activity timestamp
      let lastActive = null;
      attempts.forEach(a => {
        const t = a.createdAt?.toDate?.() || (a.createdAt?.seconds ? new Date(a.createdAt.seconds * 1000) : null);
        if (t && (!lastActive || t > lastActive)) lastActive = t;
      });

      studentRows.push({
        name: user.displayName || 'No name',
        email: user.email || '',
        uid: user.id,
        totalAttempts,
        correctCount,
        accuracy,
        lessonsStarted: lessonsWithAttempts,
        lastActive,
        progressPercent: progress?.progressPercent || 0,
      });
    });

    // Summary stats
    const totalStudents = userData.length;
    const activeStudents = studentRows.filter(s => s.totalAttempts > 0).length;
    const totalAttempts = allAttempts.length;
    const totalCorrect = allAttempts.filter(a => a.correct).length;
    const avgAccuracy = totalAttempts > 0 ? totalCorrect / totalAttempts : 0;
    const totalTimeMs = allAttempts.reduce((sum, a) => sum + (a.timeSpentMs || 0), 0);
    const avgTimePerActivity = totalAttempts > 0 ? totalTimeMs / totalAttempts : 0;

    // Accuracy by lesson
    const accuracyByLesson = WEEKS.map(week => {
      const weekAttempts = allAttempts.filter(a => a.lessonId === week.id);
      const correct = weekAttempts.filter(a => a.correct).length;
      return {
        ...week,
        attempts: weekAttempts.length,
        accuracy: weekAttempts.length > 0 ? correct / weekAttempts.length : 0,
      };
    });

    // Completion by lesson — how many students have attempted activities per week
    const completionByLesson = WEEKS.map(week => {
      const studentsWithAttempts = new Set();
      allAttempts.forEach(a => {
        if (a.lessonId === week.id && a.userId) studentsWithAttempts.add(a.userId);
      });
      // Also check by matching user data
      userData.forEach(({ user, attempts }) => {
        if (attempts.some(a => a.lessonId === week.id)) studentsWithAttempts.add(user.id);
      });
      return {
        ...week,
        active: studentsWithAttempts.size,
        inactive: totalStudents - studentsWithAttempts.size,
      };
    });

    // Accuracy distribution (5 bins)
    const bins = [0, 0, 0, 0, 0]; // 0-20, 20-40, 40-60, 60-80, 80-100
    studentRows.forEach(s => {
      const pct = s.accuracy * 100;
      if (s.totalAttempts === 0) { bins[0]++; return; }
      const idx = Math.min(4, Math.floor(pct / 20));
      bins[idx]++;
    });

    // Activity over time (by day)
    const dailyCounts = {};
    allAttempts.forEach(a => {
      const t = a.createdAt?.toDate?.() || (a.createdAt?.seconds ? new Date(a.createdAt.seconds * 1000) : null);
      if (!t) return;
      const day = t.toISOString().slice(0, 10);
      dailyCounts[day] = (dailyCounts[day] || 0) + 1;
    });
    const activityTimeline = Object.entries(dailyCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    // Activity type breakdown
    const typeCounts = {};
    allAttempts.forEach(a => {
      const type = a.activityType || 'unknown';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    // Struggling activities
    const activityStats = {};
    allAttempts.forEach(a => {
      const key = a.activityId || 'unknown';
      if (!activityStats[key]) {
        activityStats[key] = { id: key, type: a.activityType || '', lessonId: a.lessonId || '', attempts: 0, correct: 0 };
      }
      activityStats[key].attempts++;
      if (a.correct) activityStats[key].correct++;
    });
    const strugglingActivities = Object.values(activityStats)
      .filter(a => a.attempts >= 2)
      .map(a => ({ ...a, accuracy: a.correct / a.attempts }))
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 10);

    return {
      summaryStats: { totalStudents, activeStudents, avgAccuracy, totalAttempts, avgTimePerActivity },
      accuracyByLesson,
      completionByLesson,
      accuracyDistribution: bins,
      activityTimeline,
      activityTypes: typeCounts,
      strugglingActivities,
      studentRows: studentRows.sort((a, b) => b.totalAttempts - a.totalAttempts),
    };
  }

  // ─── Render All ───────────────────────────────────────────

  function renderAll(data) {
    renderSummaryStats(data.summaryStats);
    renderAccuracyByLesson(data.accuracyByLesson);
    renderCompletionByLesson(data.completionByLesson);
    renderAccuracyDistribution(data.accuracyDistribution);
    renderActivityTypes(data.activityTypes);
    renderActivityTimeline(data.activityTimeline);
    renderStudentTable(data.studentRows);
    renderStrugglingActivities(data.strugglingActivities);
  }

  // ─── Summary Stats ───────────────────────────────────────

  function renderSummaryStats(stats) {
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };
    set('stat-total-students', stats.totalStudents);
    set('stat-active-students', stats.activeStudents);
    set('stat-avg-accuracy', (stats.avgAccuracy * 100).toFixed(1) + '%');
    set('stat-total-attempts', stats.totalAttempts.toLocaleString());

    const avgSec = stats.avgTimePerActivity / 1000;
    let timeStr;
    if (avgSec < 60) timeStr = avgSec.toFixed(1) + 's';
    else timeStr = (avgSec / 60).toFixed(1) + 'm';
    set('stat-avg-time', timeStr);
  }

  // ─── Bar Chart: Accuracy by Lesson ────────────────────────

  function renderAccuracyByLesson(data) {
    const container = document.getElementById('chart-accuracy-by-lesson');
    if (!container) return;

    const maxVal = 100;
    const barHeight = 180;

    let html = `
      <div style="position: relative; padding: 20px 10px 0;">
        <!-- Y-axis grid lines -->
        <div style="position: absolute; top: 20px; left: 40px; right: 10px; height: ${barHeight}px;">
    `;

    [100, 75, 50, 25, 0].forEach(val => {
      const top = ((maxVal - val) / maxVal) * barHeight;
      html += `
        <div style="position: absolute; top: ${top}px; left: 0; right: 0; display: flex; align-items: center;">
          <span style="font-size: 10px; color: var(--text-muted); width: 30px; text-align: right; margin-right: 8px;">${val}%</span>
          <div style="flex: 1; border-top: 1px solid rgba(255,255,255,0.05);"></div>
        </div>
      `;
    });

    html += `</div>`;

    // Bars
    html += `<div style="display: flex; align-items: flex-end; justify-content: space-around; height: ${barHeight}px; margin-left: 40px; padding-top: 0; position: relative;">`;

    data.forEach((week, i) => {
      const pct = week.accuracy * 100;
      const height = (pct / maxVal) * barHeight;
      const color = pct >= 70 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444';

      html += `
        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; max-width: 80px;">
          <span style="font-size: 11px; font-weight: 600; color: var(--text-primary);">${pct.toFixed(0)}%</span>
          <div style="width: 70%; height: ${height}px; background: ${color}; border-radius: 4px 4px 0 0; min-height: 4px; transition: height 0.6s ease; opacity: 0.85; position: relative;" title="${week.name}: ${pct.toFixed(1)}% accuracy (${week.attempts} attempts)">
          </div>
          <span style="font-size: 10px; color: var(--text-muted); text-align: center; line-height: 1.2; margin-top: 4px;">Wk ${i}</span>
        </div>
      `;
    });

    html += `</div>`;

    // Description
    html += `<p style="font-size: 11px; color: var(--text-muted); margin-top: 12px; text-align: center;">Average accuracy across all student attempts per week</p>`;
    html += `</div>`;

    container.innerHTML = html;
    container.classList.remove('chart-loading');
  }

  // ─── Grouped Bar: Completion by Lesson ────────────────────

  function renderCompletionByLesson(data) {
    const container = document.getElementById('chart-completion-by-lesson');
    if (!container) return;

    const maxVal = Math.max(1, ...data.map(d => Math.max(d.active, d.inactive)));
    const barHeight = 180;

    let html = `
      <div style="position: relative; padding: 20px 10px 0;">
        <!-- Legend -->
        <div style="display: flex; gap: 16px; justify-content: flex-end; margin-bottom: 12px; font-size: 11px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <div style="width: 10px; height: 10px; background: #22c55e; border-radius: 2px;"></div>
            <span style="color: var(--text-muted);">Active</span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <div style="width: 10px; height: 10px; background: rgba(255,255,255,0.1); border-radius: 2px;"></div>
            <span style="color: var(--text-muted);">Not Started</span>
          </div>
        </div>

        <div style="display: flex; align-items: flex-end; justify-content: space-around; height: ${barHeight}px;">
    `;

    data.forEach((week, i) => {
      const activeHeight = (week.active / maxVal) * barHeight;
      const inactiveHeight = (week.inactive / maxVal) * barHeight;

      html += `
        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; max-width: 100px;">
          <div style="display: flex; align-items: flex-end; gap: 3px; height: ${barHeight}px;">
            <div style="display: flex; flex-direction: column; align-items: center; gap: 2px;">
              <span style="font-size: 10px; color: #22c55e; font-weight: 600;">${week.active}</span>
              <div style="width: 24px; height: ${activeHeight}px; background: #22c55e; border-radius: 3px 3px 0 0; min-height: 4px; opacity: 0.8;" title="${week.name}: ${week.active} active students"></div>
            </div>
            <div style="display: flex; flex-direction: column; align-items: center; gap: 2px;">
              <span style="font-size: 10px; color: var(--text-muted);">${week.inactive}</span>
              <div style="width: 24px; height: ${inactiveHeight}px; background: rgba(255,255,255,0.1); border-radius: 3px 3px 0 0; min-height: 4px;" title="${week.name}: ${week.inactive} not started"></div>
            </div>
          </div>
          <span style="font-size: 10px; color: var(--text-muted); margin-top: 4px;">Wk ${i}</span>
        </div>
      `;
    });

    html += `</div>`;
    html += `<p style="font-size: 11px; color: var(--text-muted); margin-top: 12px; text-align: center;">Students who have attempted at least one activity per week</p>`;
    html += `</div>`;

    container.innerHTML = html;
    container.classList.remove('chart-loading');
  }

  // ─── Histogram: Accuracy Distribution ─────────────────────

  function renderAccuracyDistribution(bins) {
    const container = document.getElementById('chart-accuracy-distribution');
    if (!container) return;

    const labels = ['0–20%', '20–40%', '40–60%', '60–80%', '80–100%'];
    const barColors = ['#ef4444', '#f97316', '#f59e0b', '#22c55e', '#22c55e'];
    const maxVal = Math.max(1, ...bins);
    const barHeight = 180;

    let html = `<div style="position: relative; padding: 20px 10px 0;">`;

    html += `<div style="display: flex; align-items: flex-end; justify-content: space-around; height: ${barHeight}px;">`;

    bins.forEach((count, i) => {
      const height = (count / maxVal) * barHeight;
      html += `
        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; max-width: 80px;">
          <span style="font-size: 12px; font-weight: 600; color: var(--text-primary);">${count}</span>
          <div style="width: 70%; height: ${height}px; background: ${barColors[i]}; border-radius: 4px 4px 0 0; min-height: 4px; opacity: 0.8;" title="${labels[i]}: ${count} student(s)"></div>
          <span style="font-size: 10px; color: var(--text-muted); text-align: center;">${labels[i]}</span>
        </div>
      `;
    });

    html += `</div>`;
    html += `<p style="font-size: 11px; color: var(--text-muted); margin-top: 12px; text-align: center;">Distribution of overall student accuracy rates</p>`;
    html += `</div>`;

    container.innerHTML = html;
    container.classList.remove('chart-loading');
  }

  // ─── Donut Chart: Activity Types ──────────────────────────

  function renderActivityTypes(typeCounts) {
    const container = document.getElementById('chart-activity-types');
    if (!container) return;

    const entries = Object.entries(typeCounts).filter(([_, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) {
      container.innerHTML = `<div style="display: flex; align-items: center; justify-content: center; height: 200px; color: var(--text-muted);">No activity data</div>`;
      container.classList.remove('chart-loading');
      return;
    }

    const total = entries.reduce((sum, [_, v]) => sum + v, 0);
    const chartSize = 160;
    const cx = chartSize / 2;
    const cy = chartSize / 2;
    const outerRadius = chartSize * 0.45;
    const innerRadius = chartSize * 0.28;

    let svg = `<svg viewBox="0 0 ${chartSize} ${chartSize}" style="width: ${chartSize}px; height: ${chartSize}px; flex-shrink: 0;">`;

    let startAngle = -Math.PI / 2;
    entries.forEach(([label, value], i) => {
      const angle = (value / total) * Math.PI * 2;
      const endAngle = startAngle + angle;
      const color = COLORS[i % COLORS.length];

      // Outer arc
      const ox1 = cx + outerRadius * Math.cos(startAngle);
      const oy1 = cy + outerRadius * Math.sin(startAngle);
      const ox2 = cx + outerRadius * Math.cos(endAngle);
      const oy2 = cy + outerRadius * Math.sin(endAngle);

      // Inner arc
      const ix1 = cx + innerRadius * Math.cos(endAngle);
      const iy1 = cy + innerRadius * Math.sin(endAngle);
      const ix2 = cx + innerRadius * Math.cos(startAngle);
      const iy2 = cy + innerRadius * Math.sin(startAngle);

      const largeArc = angle > Math.PI ? 1 : 0;

      svg += `<path d="M ${ox1} ${oy1} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${ox2} ${oy2} L ${ix1} ${iy1} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix2} ${iy2} Z" fill="${color}" opacity="0.85" style="cursor: pointer;"><title>${formatTypeName(label)}: ${value} (${Math.round(value / total * 100)}%)</title></path>`;

      startAngle = endAngle;
    });

    // Center text
    svg += `<text x="${cx}" y="${cy - 6}" text-anchor="middle" fill="var(--text-primary)" font-size="18" font-weight="700" font-family="var(--font-display)">${total}</text>`;
    svg += `<text x="${cx}" y="${cy + 10}" text-anchor="middle" fill="var(--text-muted)" font-size="9">attempts</text>`;
    svg += `</svg>`;

    // Legend
    let legend = `<div style="display: flex; flex-direction: column; gap: 8px; font-size: 12px;">`;
    entries.forEach(([label, value], i) => {
      const color = COLORS[i % COLORS.length];
      const pct = Math.round(value / total * 100);
      legend += `
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="color: var(--text-primary); font-weight: 600; min-width: 32px;">${pct}%</span>
          <div style="width: 10px; height: 10px; border-radius: 2px; background: ${color}; flex-shrink: 0;"></div>
          <span style="color: var(--text-muted);">${formatTypeName(label)}</span>
        </div>
      `;
    });
    legend += `</div>`;

    container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; gap: 24px; height: 100%; padding: 16px;">
        ${svg}
        ${legend}
      </div>
    `;
    container.classList.remove('chart-loading');
  }

  // ─── Line Chart: Activity Over Time ───────────────────────

  function renderActivityTimeline(data) {
    const container = document.getElementById('chart-activity-timeline');
    if (!container) return;

    if (data.length === 0) {
      container.innerHTML = `<div style="display: flex; align-items: center; justify-content: center; height: 200px; color: var(--text-muted);">No activity data yet</div>`;
      container.classList.remove('chart-loading');
      return;
    }

    const svgWidth = 700;
    const svgHeight = 220;
    const padding = { top: 20, right: 20, bottom: 40, left: 50 };
    const chartW = svgWidth - padding.left - padding.right;
    const chartH = svgHeight - padding.top - padding.bottom;

    const maxCount = Math.max(1, ...data.map(d => d.count));
    const yStep = Math.ceil(maxCount / 4);
    const yMax = yStep * 4;

    // Generate points
    const points = data.map((d, i) => {
      const x = padding.left + (data.length === 1 ? chartW / 2 : (i / (data.length - 1)) * chartW);
      const y = padding.top + chartH - (d.count / yMax) * chartH;
      return { x, y, ...d };
    });

    let svg = `<svg viewBox="0 0 ${svgWidth} ${svgHeight}" style="width: 100%; height: auto; max-height: 260px;" preserveAspectRatio="xMidYMid meet">`;

    // Grid lines
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (i / 4) * chartH;
      const val = yMax - (i / 4) * yMax;
      svg += `<line x1="${padding.left}" y1="${y}" x2="${svgWidth - padding.right}" y2="${y}" stroke="rgba(255,255,255,0.06)" />`;
      svg += `<text x="${padding.left - 8}" y="${y + 4}" text-anchor="end" fill="var(--text-muted)" font-size="10">${Math.round(val)}</text>`;
    }

    // Area fill
    if (points.length > 1) {
      const areaPath = `M ${points[0].x} ${padding.top + chartH} ` +
        points.map(p => `L ${p.x} ${p.y}`).join(' ') +
        ` L ${points[points.length - 1].x} ${padding.top + chartH} Z`;
      svg += `<defs><linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#6366f1" stop-opacity="0.3"/><stop offset="100%" stop-color="#6366f1" stop-opacity="0.02"/></linearGradient></defs>`;
      svg += `<path d="${areaPath}" fill="url(#areaGrad)" />`;
    }

    // Line
    if (points.length > 1) {
      const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
      svg += `<path d="${linePath}" fill="none" stroke="#6366f1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />`;
    }

    // Dots
    points.forEach(p => {
      svg += `<circle cx="${p.x}" cy="${p.y}" r="4" fill="#6366f1" stroke="var(--bg-card)" stroke-width="2"><title>${p.date}: ${p.count} attempts</title></circle>`;
    });

    // X-axis labels (show first, last, and middle)
    const labelIndices = [];
    if (data.length <= 7) {
      data.forEach((_, i) => labelIndices.push(i));
    } else {
      labelIndices.push(0);
      const step = Math.floor(data.length / 5);
      for (let i = step; i < data.length - 1; i += step) labelIndices.push(i);
      labelIndices.push(data.length - 1);
    }

    labelIndices.forEach(i => {
      const p = points[i];
      const dateStr = new Date(p.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      svg += `<text x="${p.x}" y="${svgHeight - 8}" text-anchor="middle" fill="var(--text-muted)" font-size="10">${dateStr}</text>`;
    });

    svg += `</svg>`;

    container.innerHTML = `
      <div style="padding: 8px;">
        ${svg}
        <p style="font-size: 11px; color: var(--text-muted); text-align: center; margin-top: 4px;">Total activity attempts per day across all students</p>
      </div>
    `;
    container.classList.remove('chart-loading');
  }

  // ─── Student Engagement Table ─────────────────────────────

  let currentSort = { field: 'totalAttempts', dir: 'desc' };
  let cachedStudentRows = [];

  function renderStudentTable(rows) {
    const container = document.getElementById('student-table-container');
    if (!container) return;

    cachedStudentRows = rows;
    renderSortedTable(container);
  }

  function renderSortedTable(container) {
    const rows = [...cachedStudentRows];

    // Sort
    rows.sort((a, b) => {
      let aVal = a[currentSort.field];
      let bVal = b[currentSort.field];
      if (aVal instanceof Date) aVal = aVal?.getTime() || 0;
      if (bVal instanceof Date) bVal = bVal?.getTime() || 0;
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      if (aVal < bVal) return currentSort.dir === 'asc' ? -1 : 1;
      if (aVal > bVal) return currentSort.dir === 'asc' ? 1 : -1;
      return 0;
    });

    const arrow = (field) => {
      if (currentSort.field !== field) return '';
      return currentSort.dir === 'asc' ? ' ▲' : ' ▼';
    };

    let html = `
      <div style="overflow-x: auto;">
        <table class="data-table" id="student-engagement-table">
          <thead>
            <tr>
              <th class="sortable" data-sort="name">Student${arrow('name')}</th>
              <th class="sortable" data-sort="email">Email${arrow('email')}</th>
              <th class="sortable" data-sort="totalAttempts">Attempts${arrow('totalAttempts')}</th>
              <th class="sortable" data-sort="accuracy">Accuracy${arrow('accuracy')}</th>
              <th class="sortable" data-sort="lessonsStarted">Lessons${arrow('lessonsStarted')}</th>
              <th class="sortable" data-sort="lastActive">Last Active${arrow('lastActive')}</th>
            </tr>
          </thead>
          <tbody>
    `;

    if (rows.length === 0) {
      html += `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No students found</td></tr>`;
    } else {
      rows.forEach(s => {
        const pct = (s.accuracy * 100).toFixed(0);
        const accColor = pct >= 70 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444';
        const atRisk = s.totalAttempts === 0 || s.accuracy < 0.4;
        const lastActiveStr = s.lastActive
          ? s.lastActive.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
          : 'Never';

        html += `
          <tr${atRisk ? ' style="background: rgba(239, 68, 68, 0.06);"' : ''}>
            <td>
              <div style="display: flex; align-items: center; gap: 0.75rem;">
                <div style="width: 32px; height: 32px; background: var(--accent-primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.8rem; flex-shrink: 0;">
                  ${(s.name || '?')[0].toUpperCase()}
                </div>
                <span style="font-weight: 500;">${escapeHtml(s.name)}</span>
              </div>
            </td>
            <td style="font-size: 0.85rem; color: var(--text-muted);">${escapeHtml(s.email)}</td>
            <td style="font-weight: 600;">${s.totalAttempts}</td>
            <td><span style="color: ${accColor}; font-weight: 600;">${s.totalAttempts > 0 ? pct + '%' : '—'}</span></td>
            <td>${s.lessonsStarted} / 5</td>
            <td style="font-size: 0.85rem; color: var(--text-muted);">${lastActiveStr}</td>
          </tr>
        `;
      });
    }

    html += `</tbody></table></div>`;
    html += `<p style="font-size: 11px; color: var(--text-muted); margin-top: 8px;">Students with low accuracy or no attempts are highlighted. Click column headers to sort.</p>`;

    container.innerHTML = html;

    // Add sort listeners
    container.querySelectorAll('.sortable').forEach(th => {
      th.style.cursor = 'pointer';
      th.style.userSelect = 'none';
      th.addEventListener('click', () => {
        const field = th.dataset.sort;
        if (currentSort.field === field) {
          currentSort.dir = currentSort.dir === 'asc' ? 'desc' : 'asc';
        } else {
          currentSort.field = field;
          currentSort.dir = 'desc';
        }
        renderSortedTable(container);
      });
    });
  }

  // ─── Struggling Activities Table ──────────────────────────

  function renderStrugglingActivities(activities) {
    const container = document.getElementById('struggling-activities-container');
    if (!container) return;

    if (activities.length === 0) {
      container.innerHTML = `<div style="text-align: center; padding: 2rem; color: var(--text-muted);">Not enough data to identify struggling activities yet</div>`;
      return;
    }

    const weekName = (lessonId) => {
      const w = WEEKS.find(w => w.id === lessonId);
      return w ? w.name : lessonId;
    };

    let html = `
      <div style="overflow-x: auto;">
        <table class="data-table">
          <thead>
            <tr>
              <th>Activity</th>
              <th>Type</th>
              <th>Week</th>
              <th>Attempts</th>
              <th>Accuracy</th>
            </tr>
          </thead>
          <tbody>
    `;

    activities.forEach(a => {
      const pct = (a.accuracy * 100).toFixed(0);
      const color = pct >= 70 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444';

      html += `
        <tr>
          <td style="font-weight: 500; font-size: 0.85rem;">${formatActivityName(a.id)}</td>
          <td><span style="font-size: 0.8rem; color: var(--text-muted);">${formatTypeName(a.type)}</span></td>
          <td style="font-size: 0.85rem;">${weekName(a.lessonId)}</td>
          <td style="font-weight: 600;">${a.attempts}</td>
          <td><span style="color: ${color}; font-weight: 600;">${pct}%</span></td>
        </tr>
      `;
    });

    html += `</tbody></table></div>`;
    html += `<p style="font-size: 11px; color: var(--text-muted); margin-top: 8px;">Activities with the lowest accuracy rates (minimum 2 attempts). These may need extra support or clearer instructions.</p>`;

    container.innerHTML = html;
  }

  // ─── Helpers ──────────────────────────────────────────────

  function formatTypeName(type) {
    const map = {
      'activity': 'Quiz/Activity',
      'quiz': 'Quiz',
      'drag-drop': 'Drag & Drop',
      'code': 'Code',
      'demo': 'Demo',
      'challenge': 'Challenge',
      'matching': 'Matching',
      'free-response': 'Free Response',
      'sequence': 'Sequence',
      'unknown': 'Other',
    };
    return map[type] || type.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  function formatActivityName(id) {
    return id
      .replace(/^(ai-quiz-|pg-seq-|pg-mc-|pg-drag-|pg-match-|pg-code-|pg-free-|pg-demo-)/, '')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ─── Public API ───────────────────────────────────────────

  return { fetchAllData, renderAll };

})();

if (typeof window !== 'undefined') {
  window.EOAnalytics = EOAnalytics;
}
