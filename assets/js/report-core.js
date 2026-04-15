/* =========================================================
   Namwon GeoVision — 보고서 렌더링 공통 모듈
   report.html / report-history.html에서 공유
   ========================================================= */
(function () {
  'use strict';

  var STORAGE_KEY = 'namwon-saved-reports';

  var CLASS_KO = {
    Pothole: '포트홀', Crack: '크랙', Patch: '보수흔적', Void_Suspected: '공동의심',
    Litter: '쓰레기', Barrier_Damaged: '중앙분리대파손', Delineator_Damaged: '시선유도봉파손',
    Pedestrian_Facility_Damaged: '보행안전시설파손', Sign_Damaged: '교통표지판파손',
    Lane_Faded: '도로차선불량', Color_Manhole: '컬러맨홀', Illegal_Parking: '불법주정차'
  };

  var BRAND_COLORS = {
    primary: '#C8102E',
    primaryLight: '#E03A52',
    gray1: '#495057',
    gray2: '#868E96',
    gray3: '#CED4DA',
    grayBg: '#F1F3F5',
    text: '#212529'
  };

  var state = {
    allData: null,
    allJobs: [],
    charts: {}
  };

  function initChartDefaults() {
    if (typeof Chart === 'undefined') return;
    Chart.defaults.font.family = "'Noto Sans KR', sans-serif";
    Chart.defaults.font.size = 11;
    Chart.defaults.color = BRAND_COLORS.text;
  }

  // ── 데이터 로드 ──
  function loadData() {
    if (state.allData && state.allJobs.length) {
      return Promise.resolve({ allData: state.allData, allJobs: state.allJobs });
    }
    return Promise.all([
      fetch('assets/data/sample-detections.json').then(function (r) { return r.json(); }),
      fetch('assets/data/sample-jobs.json').then(function (r) { return r.json(); })
    ]).then(function (results) {
      state.allData = results[0];
      state.allJobs = results[1].jobs.slice().sort(function (a, b) {
        return b.analyzed_at.localeCompare(a.analyzed_at);
      });
      return { allData: state.allData, allJobs: state.allJobs };
    }).catch(function () {
      state.allData = { detections: [], summary: { total: 0 } };
      state.allJobs = [];
      return { allData: state.allData, allJobs: state.allJobs };
    });
  }

  // ── localStorage ──
  function getSavedReports() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch (e) { return []; }
  }

  function saveReport(payload) {
    var list = getSavedReports().filter(function (r) { return r.id !== payload.id; });
    list.unshift(payload);
    if (list.length > 20) list = list.slice(0, 20);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }
    catch (e) { console.warn('저장 공간 초과', e); }
  }

  function deleteReport(reportId) {
    var list = getSavedReports().filter(function (r) { return r.id !== reportId; });
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch (e) {}
  }

  // ── 집계 & 필터 ──
  function getDetectionsForJobs(jobIds) {
    if (!state.allData || !state.allJobs) return [];
    var activeDetIds = new Set();
    state.allJobs.forEach(function (j) {
      if (jobIds.indexOf(j.job_id) !== -1) {
        j.detection_ids.forEach(function (id) { activeDetIds.add(id); });
      }
    });
    return state.allData.detections.filter(function (d) { return activeDetIds.has(d.id); });
  }

  function buildSummary(dets) {
    var s = {
      total: dets.length,
      orthophoto_count: 0,
      camera_count: 0,
      high_severity: 0,
      medium_severity: 0,
      low_severity: 0,
      status_counts: { '미처리': 0, '처리중': 0, '완료': 0 },
      class_counts: {}
    };
    dets.forEach(function (d) {
      if (d.model_type === 'orthophoto') s.orthophoto_count++;
      else s.camera_count++;
      if (d.severity === 'high') s.high_severity++;
      else if (d.severity === 'medium') s.medium_severity++;
      else s.low_severity++;
      s.status_counts[d.status] = (s.status_counts[d.status] || 0) + 1;
      s.class_counts[d.class_en] = (s.class_counts[d.class_en] || 0) + 1;
    });
    return s;
  }

  function extractRegion(address) {
    if (!address) return '기타';
    var m = address.match(/남원시\s*(\S+?(?:동|읍|면|리))/);
    return m ? m[1] : '기타';
  }

  // ── 차트 렌더 ──
  function destroyCharts() {
    Object.keys(state.charts).forEach(function (k) {
      if (state.charts[k]) state.charts[k].destroy();
    });
    state.charts = {};
  }

  function renderClassChart(summary) {
    var el = document.getElementById('chart-class');
    if (!el) return;
    var entries = Object.entries(summary.class_counts).sort(function (a, b) { return b[1] - a[1]; });
    var labels = entries.map(function (e) { return CLASS_KO[e[0]] || e[0]; });
    var values = entries.map(function (e) { return e[1]; });
    var bgColors = values.map(function (v, i) { return i === 0 ? BRAND_COLORS.primary : BRAND_COLORS.gray2; });

    state.charts.classChart = new Chart(el, {
      type: 'bar',
      data: { labels: labels, datasets: [{ data: values, backgroundColor: bgColors, borderRadius: 4 }] },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 600 },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: function (c) { return ' ' + c.parsed.x + '건'; } } }
        },
        scales: {
          x: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { precision: 0 } },
          y: { grid: { display: false } }
        }
      }
    });
  }

  function renderSeverityChart(summary) {
    var el = document.getElementById('chart-severity');
    if (!el) return;
    state.charts.severityChart = new Chart(el, {
      type: 'doughnut',
      data: {
        labels: ['고위험', '주의', '양호'],
        datasets: [{
          data: [summary.high_severity, summary.medium_severity, summary.low_severity],
          backgroundColor: [BRAND_COLORS.primary, BRAND_COLORS.gray2, BRAND_COLORS.gray3],
          borderWidth: 0,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        animation: { duration: 600 },
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 11, padding: 10, font: { size: 11 } } }
        }
      }
    });
  }

  function renderRegionSection(dets) {
    var regionAgg = {};
    dets.forEach(function (d) {
      var r = extractRegion(d.address);
      if (!regionAgg[r]) regionAgg[r] = { total: 0, high: 0, unprocessed: 0 };
      regionAgg[r].total++;
      if (d.severity === 'high') regionAgg[r].high++;
      if (d.status === '미처리') regionAgg[r].unprocessed++;
    });
    var sortedRegions = Object.entries(regionAgg).sort(function (a, b) { return b[1].total - a[1].total; });

    var tbody = document.getElementById('rs-region-tbody');
    if (tbody) {
      tbody.innerHTML = '';
      if (sortedRegions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:14px;color:#94A3B8;">지역 데이터가 없습니다.</td></tr>';
      } else {
        sortedRegions.forEach(function (entry) {
          var r = entry[0], v = entry[1];
          var doneRate = v.total > 0 ? Math.round((v.total - v.unprocessed) / v.total * 100) : 0;
          tbody.insertAdjacentHTML('beforeend',
            '<tr>' +
            '<td class="col-region" style="font-weight:700;">' + r + '</td>' +
            '<td class="col-num" style="font-weight:600;">' + v.total + '</td>' +
            '<td class="col-num" style="color:' + (v.high > 0 ? '#C8102E' : '#94A3B8') + ';font-weight:700;">' + v.high + '</td>' +
            '<td class="col-num" style="color:' + (v.unprocessed > 0 ? '#c47a30' : '#94A3B8') + ';font-weight:700;">' + v.unprocessed + '</td>' +
            '<td class="col-rate" style="font-weight:700;color:#495057;">' + doneRate + '%</td>' +
            '</tr>'
          );
        });
      }
    }

    var chartEl = document.getElementById('chart-region');
    if (!chartEl) return;
    var labels = sortedRegions.map(function (e) { return e[0]; });
    var totals = sortedRegions.map(function (e) { return e[1].total; });
    var highs = sortedRegions.map(function (e) { return e[1].high; });

    state.charts.regionChart = new Chart(chartEl, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          { label: '전체', data: totals, backgroundColor: BRAND_COLORS.gray2, borderRadius: 4 },
          { label: '고위험', data: highs, backgroundColor: BRAND_COLORS.primary, borderRadius: 4 }
        ]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 600 },
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 10, padding: 10, font: { size: 11 } } },
          tooltip: { callbacks: { label: function (c) { return ' ' + c.dataset.label + ': ' + c.parsed.x + '건'; } } }
        },
        scales: {
          x: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { precision: 0 } },
          y: { grid: { display: false }, ticks: { font: { size: 12 } } }
        }
      }
    });
  }

  function renderJobTable(selectedJobs) {
    var tbody = document.getElementById('rs-job-table');
    if (!tbody) return;
    tbody.innerHTML = '';
    selectedJobs.slice().sort(function (a, b) {
      return b.analyzed_at.localeCompare(a.analyzed_at);
    }).forEach(function (job) {
      var captured = job.captured_at.replace(/-/g, '.');
      var analyzed = job.analyzed_at.substring(0, 10).replace(/-/g, '.');
      tbody.insertAdjacentHTML('beforeend',
        '<tr>' +
        '<td style="color:#64748B;font-size:12px;">' + job.job_id + '</td>' +
        '<td style="font-weight:600;">' + (job.source_label || job.source_name) + '</td>' +
        '<td style="">' + captured + '</td>' +
        '<td style="">' + analyzed + '</td>' +
        '<td style="text-align:center;font-weight:700;">' + job.detection_count + '</td>' +
        '<td style="text-align:center;font-weight:700;color:' + (job.high_count > 0 ? '#C8102E' : '#94A3B8') + ';">' + job.high_count + '</td>' +
        '</tr>'
      );
    });
  }

  function renderMonthlyChart(dets) {
    var el = document.getElementById('chart-monthly');
    if (!el) return;
    var months = {};
    dets.forEach(function (d) {
      var m = d.detected_at.substring(0, 7);
      months[m] = (months[m] || 0) + 1;
    });
    var keys = Object.keys(months).sort();
    var labels = keys.map(function (k) { return k.replace('-', '.'); });
    var values = keys.map(function (k) { return months[k]; });

    state.charts.monthlyChart = new Chart(el, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: '탐지 건수',
          data: values,
          borderColor: BRAND_COLORS.primary,
          backgroundColor: 'rgba(200,16,46,0.08)',
          borderWidth: 2.5,
          pointBackgroundColor: BRAND_COLORS.primary,
          pointRadius: 5,
          pointHoverRadius: 7,
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 600 },
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { precision: 0 } },
          x: { grid: { display: false } }
        }
      }
    });
  }

  function renderHighTable(dets) {
    var tbody = document.getElementById('rs-high-table');
    if (!tbody) return;
    var sorted = dets.slice().sort(function (a, b) {
      var sevOrder = { high: 0, medium: 1, low: 2 };
      var sa = sevOrder[a.severity], sb = sevOrder[b.severity];
      if (sa !== sb) return sa - sb;
      return b.confidence - a.confidence;
    });

    tbody.innerHTML = '';

    var titleEl = document.getElementById('rs-list-title');
    if (titleEl) titleEl.textContent = '6. 탐지 객체 목록 (총 ' + sorted.length + '건)';

    if (sorted.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:14px;color:#94A3B8;">탐지된 객체가 없습니다.</td></tr>';
      return;
    }

    var sevKo = { high: '고위험', medium: '주의', low: '양호' };
    var sevCol = { high: '#C8102E', medium: '#F4A261', low: '#2A9D8F' };

    sorted.forEach(function (d) {
      var date = d.detected_at.substring(0, 10).replace(/-/g, '.');
      var conf = (d.confidence * 100).toFixed(0) + '%';
      tbody.insertAdjacentHTML('beforeend',
        '<tr>' +
        '<td style="color:#64748B;">' + d.id + '</td>' +
        '<td style="font-weight:600;">' + d.class_ko + '</td>' +
        '<td style="text-align:center;color:' + sevCol[d.severity] + ';font-weight:700;">' + sevKo[d.severity] + '</td>' +
        '<td style="font-size:12px;">' + d.address + '</td>' +
        '<td style="">' + date + '</td>' +
        '<td style="font-weight:700;color:#C8102E;">' + conf + '</td>' +
        '<td>' + d.status + '</td>' +
        '</tr>'
      );
    });
  }

  // ── 메인 렌더 ──
  // config: { sourceType, periodStart, periodEnd, selectedJobIds, reportType, opinion }
  function renderReport(config) {
    if (!state.allData) return { ok: false, reason: '데이터가 아직 로드되지 않았습니다.' };
    var jobIds = config.selectedJobIds || [];
    if (jobIds.length === 0) return { ok: false, reason: '대상 분석 작업이 없습니다.' };

    var dets = getDetectionsForJobs(jobIds);
    if (dets.length === 0) return { ok: false, reason: '선택된 작업에 탐지 결과가 없습니다.' };

    var selectedJobs = state.allJobs.filter(function (j) { return jobIds.indexOf(j.job_id) !== -1; });
    var regions = Array.from(new Set(selectedJobs.map(function (j) { return j.region; }))).join(', ');
    var analyzedDates = selectedJobs.map(function (j) { return j.analyzed_at.substring(0, 10); }).sort();
    var jobPeriodStart = config.periodStart || analyzedDates[0];
    var jobPeriodEnd = config.periodEnd || analyzedDates[analyzedDates.length - 1];

    var summary = buildSummary(dets);
    var sourceTypeLabel = config.sourceType === 'orthophoto' ? '정사영상' : '차량 카메라';

    destroyCharts();

    // 헤더
    var typeLabel = { monthly: '월간 정기', weekly: '주간 현황', incident: '긴급 이슈' }[config.reportType] || '월간 정기';
    setText('rs-subtitle', sourceTypeLabel + ' AI 분석 ' + typeLabel + ' 보고서 · 대상 작업 ' + selectedJobs.length + '건');
    setText('rs-period', (jobPeriodStart || '').replace(/-/g, '.') + ' ~ ' + (jobPeriodEnd || '').replace(/-/g, '.'));
    setText('rs-region', regions || '남원시');
    setText('rs-generated', new Date().toLocaleString('ko-KR'));

    // KPI
    setText('rs-total', summary.total);
    setText('rs-high', summary.high_severity);
    setText('rs-unprocessed', summary.status_counts['미처리'] || 0);
    setText('rs-done', summary.status_counts['완료'] || 0);

    // 차트
    renderClassChart(summary);
    renderSeverityChart(summary);
    renderJobTable(selectedJobs);
    renderRegionSection(dets);
    renderMonthlyChart(dets);
    renderHighTable(dets);

    // 의견
    var opinionInput = document.getElementById('rs-opinion-input');
    if (opinionInput) {
      if (config.opinion !== undefined && config.opinion !== null) {
        opinionInput.value = config.opinion;
      }
      opinionInput.placeholder = '선택한 분석 작업 ' + selectedJobs.length + '건에 대한 종합 의견과 권고사항을 직접 작성하세요.';
    }

    return {
      ok: true,
      summary: summary,
      dets: dets,
      selectedJobs: selectedJobs,
      sourceTypeLabel: sourceTypeLabel,
      periodStart: jobPeriodStart,
      periodEnd: jobPeriodEnd,
      region: regions || '남원시'
    };
  }

  function setText(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  // ── PDF 다운로드 ──
  function downloadPDF(sheetEl, onBefore, onAfter) {
    if (!sheetEl || sheetEl.style.display === 'none') {
      if (window.NotifyUI) NotifyUI.warn('먼저 보고서를 생성하세요.');
      return;
    }
    if (typeof html2canvas === 'undefined' || typeof jspdf === 'undefined') {
      if (window.NotifyUI) NotifyUI.error('PDF 라이브러리를 로드할 수 없습니다.');
      window.print();
      return;
    }
    if (onBefore) onBefore();

    html2canvas(sheetEl, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false }).then(function (canvas) {
      var imgData = canvas.toDataURL('image/jpeg', 0.92);
      var pdf = new jspdf.jsPDF('p', 'mm', 'a4');
      var pageW = pdf.internal.pageSize.getWidth();
      var pageH = pdf.internal.pageSize.getHeight();
      var imgW = pageW;
      var imgH = canvas.height * imgW / canvas.width;
      var position = 0;
      var heightLeft = imgH;

      pdf.addImage(imgData, 'JPEG', 0, position, imgW, imgH);
      heightLeft -= pageH;
      while (heightLeft > 0) {
        position = heightLeft - imgH;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgW, imgH);
        heightLeft -= pageH;
      }

      var today = new Date();
      var dateStr = today.getFullYear() + String(today.getMonth() + 1).padStart(2, '0') + String(today.getDate()).padStart(2, '0');
      pdf.save('남원시_도로안전_보고서_' + dateStr + '.pdf');
      if (onAfter) onAfter(null);
    }).catch(function (err) {
      console.error('PDF 생성 오류:', err);
      if (window.NotifyUI) NotifyUI.error('PDF 생성 중 오류가 발생했습니다.');
      if (onAfter) onAfter(err);
    });
  }

  // ── 외부 API ──
  initChartDefaults();
  window.ReportCore = {
    STORAGE_KEY: STORAGE_KEY,
    CLASS_KO: CLASS_KO,
    BRAND_COLORS: BRAND_COLORS,
    loadData: loadData,
    getState: function () { return state; },
    getSavedReports: getSavedReports,
    saveReport: saveReport,
    deleteReport: deleteReport,
    getDetectionsForJobs: getDetectionsForJobs,
    buildSummary: buildSummary,
    renderReport: renderReport,
    downloadPDF: downloadPDF,
    destroyCharts: destroyCharts
  };
})();
