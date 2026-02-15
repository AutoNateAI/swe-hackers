import { createLogger } from '../../lib/logger.mjs';

const log = createLogger('chart-generator');

const CHART_COLORS = {
  primary: 'rgba(121, 134, 203, 0.8)',
  primaryBg: 'rgba(121, 134, 203, 0.2)',
  secondary: 'rgba(77, 182, 172, 0.8)',
  secondaryBg: 'rgba(77, 182, 172, 0.2)',
  accent: 'rgba(255, 213, 79, 0.8)',
  accentBg: 'rgba(255, 213, 79, 0.2)',
  danger: 'rgba(239, 83, 80, 0.8)',
  dangerBg: 'rgba(239, 83, 80, 0.2)',
  palette: [
    'rgba(121, 134, 203, 0.8)',
    'rgba(77, 182, 172, 0.8)',
    'rgba(255, 213, 79, 0.8)',
    'rgba(239, 83, 80, 0.8)',
    'rgba(206, 147, 216, 0.8)',
    'rgba(79, 195, 247, 0.8)',
    'rgba(255, 138, 101, 0.8)',
    'rgba(102, 187, 106, 0.8)'
  ]
};

const DEFAULT_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: { color: '#e8e8f0', font: { size: 11 } }
    },
    title: {
      display: false
    }
  },
  scales: {
    x: {
      ticks: { color: '#a0a0b8' },
      grid: { color: 'rgba(255,255,255,0.05)' }
    },
    y: {
      ticks: { color: '#a0a0b8' },
      grid: { color: 'rgba(255,255,255,0.05)' }
    }
  }
};

export function validateChartData(data) {
  if (!data || typeof data !== 'object') return false;
  if (!data.type || !data.data) return false;
  if (!data.data.labels || !Array.isArray(data.data.labels)) return false;
  if (!data.data.datasets || !Array.isArray(data.data.datasets)) return false;
  return true;
}

export function normalizeChartData(data) {
  if (!validateChartData(data)) {
    log.warn('Invalid Chart.js data, returning null');
    return null;
  }

  const normalized = { ...data };

  // Apply default colors if missing
  normalized.data.datasets = normalized.data.datasets.map((ds, i) => ({
    ...ds,
    backgroundColor: ds.backgroundColor || CHART_COLORS.palette[i % CHART_COLORS.palette.length],
    borderColor: ds.borderColor || CHART_COLORS.palette[i % CHART_COLORS.palette.length]
  }));

  // Merge with default options for axes charts
  if (['bar', 'line'].includes(normalized.type)) {
    normalized.options = { ...DEFAULT_OPTIONS, ...(normalized.options || {}) };
  } else {
    // Pie/doughnut/radar don't need axis scales
    const { scales, ...rest } = DEFAULT_OPTIONS;
    normalized.options = { ...rest, ...(normalized.options || {}) };
  }

  return normalized;
}

export function createBarChart(labels, datasets) {
  return normalizeChartData({
    type: 'bar',
    data: { labels, datasets }
  });
}

export function createLineChart(labels, datasets) {
  return normalizeChartData({
    type: 'line',
    data: {
      labels,
      datasets: datasets.map(ds => ({
        ...ds,
        fill: ds.fill !== undefined ? ds.fill : true,
        tension: ds.tension || 0.3
      }))
    }
  });
}
