// ===== DEMO DATA (simulated: no real IoT sensors or GPS) =====
// "days" = how many days ago the shipment was dispatched, "exc" = number of past temperature excursions
const shipments = [
  { id: 'SH-1001', product: 'COVID Vaccines', cat: 'Vaccines', vehicle: 'TRK-101', from: 'Mumbai', to: 'Delhi', temp: 4.5, min: 2, max: 8, hum: 55, status: 'In Transit', days: 0, exc: 3, eta: '6:30 PM' },
  { id: 'SH-1002', product: 'Insulin Pens', cat: 'Medicines', vehicle: 'TRK-102', from: 'Pune', to: 'Jaipur', temp: 7.4, min: 2, max: 8, hum: 48, status: 'In Transit', days: 0, exc: 2, eta: '9:15 PM' },
  { id: 'SH-1003', product: 'Fresh Milk', cat: 'Dairy', vehicle: 'TRK-103', from: 'Ludhiana', to: 'Chandigarh', temp: 6.8, min: 1, max: 6, hum: 62, status: 'Delayed', days: 1, exc: 5, eta: 'Tomorrow 8:00 AM' },
  { id: 'SH-1004', product: 'Frozen Chicken', cat: 'Frozen Food', vehicle: 'TRK-104', from: 'Chennai', to: 'Bengaluru', temp: -18.4, min: -22, max: -16, hum: 40, status: 'Delivered', days: 3, exc: 1, eta: 'Delivered' },
  { id: 'SH-1005', product: 'Ice Cream', cat: 'Frozen Food', vehicle: 'TRK-101', from: 'Mumbai', to: 'Surat', temp: -16.6, min: -22, max: -16, hum: 44, status: 'In Transit', days: 0, exc: 2, eta: '4:45 PM' },
  { id: 'SH-1006', product: 'Fresh Apples', cat: 'Fruits', vehicle: 'TRK-102', from: 'Shimla', to: 'Delhi', temp: 2.5, min: 1, max: 4, hum: 70, status: 'Delivered', days: 9, exc: 0, eta: 'Delivered' }
];
const vehicles = [
  { id: 'TRK-101', driver: 'Rahul S.', status: 'In Transit', progress: 45, speed: 62, from: 'Mumbai', to: 'Delhi' },
  { id: 'TRK-102', driver: 'Amit K.', status: 'In Transit', progress: 70, speed: 55, from: 'Pune', to: 'Jaipur' },
  { id: 'TRK-103', driver: 'Sukhdev P.', status: 'Delayed', progress: 30, speed: 20, from: 'Ludhiana', to: 'Chandigarh' },
  { id: 'TRK-104', driver: 'Karthik R.', status: 'Idle', progress: 100, speed: 0, from: 'Chennai', to: 'Bengaluru' }
];
let alerts = [
  { id: 1, ship: 'SH-1003', type: 'High Temperature', time: '10:42 AM', sev: 'Critical', resolved: false },
  { id: 2, ship: 'SH-1002', type: 'Near Upper Limit', time: '10:15 AM', sev: 'Warning', resolved: false },
  { id: 3, ship: 'SH-1005', type: 'Near Upper Limit', time: '09:50 AM', sev: 'Warning', resolved: false },
  { id: 4, ship: 'SH-1001', type: 'Door Opened', time: '08:20 AM', sev: 'Warning', resolved: false }
];
shipments.forEach(s => s.history = Array.from({ length: 12 }, () => +(s.temp + (Math.random() - .5)).toFixed(1)));

// ===== Settings and helpers =====
let useF = false, filter = 'All', chartId = 'SH-1001', interval = 4000, timer;
const $ = id => document.getElementById(id);
const stateColor = { normal: 'teal', warning: 'orange', critical: 'red' };
const statusColor = { 'In Transit': 'blue', Delivered: 'teal', Delayed: 'orange', Idle: 'gray' };
const icon = n => `<svg class="i"><use href="#i-${n}"/></svg>`;
const badge = (text, color) => `<span class="badge ${color}">${text}</span>`;
const fmt = t => useF ? (t * 9 / 5 + 32).toFixed(1) + '°F' : t.toFixed(1) + '°C';
const cap = w => w[0].toUpperCase() + w.slice(1);

// Decides the colour state of a shipment: critical = outside range, warning = within 1 degree of a limit
function tempState(s) {
  if (s.temp < s.min || s.temp > s.max) return 'critical';
  if (s.temp < s.min + 1 || s.temp > s.max - 1) return 'warning';
  return 'normal';
}

window.addEventListener("load", function () {
  setTimeout(function () {
    const chart = document.getElementById("chart");

    if (chart) {
      window.dispatchEvent(new Event("resize"));
    }
  }, 300);
});

function showToast(msg) {
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}
function openModal(html) { $('modalBox').innerHTML = html; $('modal').classList.add('open'); }
function closeModal() { $('modal').classList.remove('open'); }

// Switches between dashboard sections
function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === name));
  document.querySelectorAll('.nav-btn[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === name));
  $('app').classList.remove('open');
  if (name === 'temperature') drawChart();
}

// Counts a number up (or down) smoothly to its new value
function animateNumber(el, target) {
  const from = +el.textContent || 0, start = performance.now();
  (function step(now) {
    const p = Math.min((now - start) / 700, 1);
    el.textContent = Math.round(from + (target - from) * p);
    if (p < 1) requestAnimationFrame(step);
  })(start);
}

// ===== Rendering functions (each one fills one part of the page) =====
function renderStats() {
  animateNumber($('st-alert'), alerts.filter(a => !a.resolved).length);
  animateNumber($('st-ship'), shipments.filter(s => s.status !== 'Delivered').length);
  animateNumber($('st-veh'), vehicles.filter(v => v.status !== 'Idle').length);
  animateNumber($('st-done'), shipments.filter(s => s.status === 'Delivered').length);
}
function renderDashboardLists() {
  $('recentList').innerHTML = shipments.map(s => `<li data-open="${s.id}">${s.product} - ${s.id}</li>`).join('');
  const top = [...shipments].sort((a, b) => b.exc - a.exc).slice(0, 5);
  $('excBody').innerHTML = top.map(s => `<tr data-open="${s.id}"><td>${s.product} - ${s.id}</td><td>${s.exc}</td></tr>`).join('');
  // Donut chart: total excursions per product type, drawn with a CSS conic-gradient
  const cats = {}; shipments.forEach(s => cats[s.cat] = (cats[s.cat] || 0) + s.exc);
  const names = Object.keys(cats), colors = ['#3b9bf5', '#2bb08a', '#f6a623', '#ef4a4a', '#8bbf2a'];
  const total = Object.values(cats).reduce((a, b) => a + b, 0) || 1; let acc = 0;
  const stops = names.map((n, i) => { const from = acc; acc += cats[n] / total * 100; return `${colors[i]} ${from}% ${acc}%`; });
  $('donut').style.background = `conic-gradient(${stops.join(',')})`;
  $('donutLegend').innerHTML = names.map((n, i) => `<span><i style="background:${colors[i]}"></i>${n} (${cats[n]})</span>`).join('');
}
// Temperature cards are built once, then only updated so the bar animates smoothly
function renderTemps() {
  const box = $('tempCards'), live = shipments.filter(s => s.status !== 'Delivered');
  if (box.children.length !== live.length) {
    box.innerHTML = live.map(s => `<div class="card tcard"><b>${s.product}</b> <small>${s.id}</small><div class="t-val"></div><div class="track"><div class="t-fill"></div></div><div class="range"><span>Min ${fmt(s.min)}</span><span class="t-badge"></span><span>Max ${fmt(s.max)}</span></div></div>`).join('');
  }
  live.forEach((s, i) => {
    const c = box.children[i], st = tempState(s), col = stateColor[st];
    c.className = 'card tcard ' + col;
    c.querySelector('.t-val').textContent = fmt(s.temp);
    c.querySelector('.t-fill').style.width = Math.max(4, Math.min(100, (s.temp - s.min) / (s.max - s.min) * 100)) + '%';
    c.querySelector('.t-badge').innerHTML = badge(cap(st), col);
  });
}
// Draws the line chart on a canvas for the selected shipment
function drawChart() {
  const cv = $('chart'), s = shipments.find(x => x.id === chartId);
  const w = cv.width = cv.clientWidth, h = cv.height = cv.clientHeight;
  if (!w) return;
  const g = cv.getContext('2d'), lo = Math.min(s.min, ...s.history) - 1, hi = Math.max(s.max, ...s.history) + 1;
  const y = v => h - 20 - (v - lo) / (hi - lo) * (h - 40);
  g.fillStyle = '#2bb08a22'; g.fillRect(0, y(s.max), w, y(s.min) - y(s.max)); // safe range band
  g.strokeStyle = '#3b9bf5'; g.lineWidth = 2.5; g.beginPath();
  s.history.forEach((v, i) => { const x = 10 + i * (w - 20) / (s.history.length - 1); i ? g.lineTo(x, y(v)) : g.moveTo(x, y(v)); });
  g.stroke();
  g.fillStyle = '#7a8599'; g.font = '12px sans-serif';
  g.fillText('Max ' + fmt(s.max), 8, y(s.max) - 4); g.fillText('Min ' + fmt(s.min), 8, y(s.min) + 14);
}
// Applies the search box, status filter and date filter together
function visibleShipments() {
  const q = $('searchInput').value.toLowerCase(), days = +$('dateFilter').value;
  return shipments.filter(s => s.days <= days && (filter === 'All' || s.status === filter) &&
    [s.id, s.product, s.vehicle, s.from, s.to].join(' ').toLowerCase().includes(q));
}
function renderShipments() {
  const rows = visibleShipments().map(s => `<tr data-open="${s.id}"><td>${s.id}</td><td>${s.product}</td><td>${s.vehicle}</td><td>${s.from}</td><td>${s.to}</td>
    <td>${badge(fmt(s.temp), stateColor[tempState(s)])}</td><td>${badge(s.status, statusColor[s.status])}</td><td><button class="btn" data-open="${s.id}">Details</button></td></tr>`);
  $('shipBody').innerHTML = rows.join('') || '<tr><td colspan="8">No shipments match your search or filters.</td></tr>';
}
function renderAlerts() {
  $('alertList').innerHTML = alerts.map(a => {
    const col = a.resolved ? 'gray' : a.sev === 'Critical' ? 'red' : 'orange';
    return `<div class="card alert ${col} ${a.resolved ? 'done' : ''}"><div class="ico">${icon('warn')}</div>
      <div class="info"><b>${a.type}</b> on ${a.ship}<br><small>${a.time}</small></div>${badge(a.sev, col)}
      ${a.resolved ? badge('Resolved', 'teal') : `<button class="btn" data-resolve="${a.id}">${icon('check')}Mark resolved</button>`}</div>`;
  }).join('');
  const open = alerts.filter(a => !a.resolved);
  $('bellCount').textContent = open.length;
  $('notifPanel').innerHTML = open.slice(0, 5).map(a => `<p><b>${a.sev}:</b> ${a.type} (${a.ship}) at ${a.time}</p>`).join('') || '<p>No new notifications.</p>';
}
function renderVehicles() {
  $('vehicleList').innerHTML = vehicles.map(v => {
    const mine = shipments.filter(s => s.vehicle === v.id).map(s => s.id).join(', ');
    const p = Math.round(v.progress);
    return `<div class="card"><div class="row"><b>${v.id}</b>${badge(v.status, statusColor[v.status])}</div>
      <small>Driver: ${v.driver} | Speed: ${v.speed} km/h</small>
      <div class="route"><b style="width:${p}%"></b><svg class="i" style="left:${p}%"><use href="#i-truck"/></svg></div>
      <div class="route-lbl"><span>${v.from}</span><span>${p}%</span><span>${v.to}</span></div>
      <small>Assigned shipments: ${mine}</small></div>`;
  }).join('');
}
function renderAll() {
  renderStats(); renderDashboardLists(); renderTemps(); renderShipments(); renderAlerts(); renderVehicles();
  if ($('temperature').classList.contains('active')) drawChart();
}

// ===== Simulation: runs every few seconds and changes the fake sensor readings =====
function simulate() {
  shipments.forEach(s => {
    if (s.status === 'Delivered') return;
    const mid = (s.min + s.max) / 2;
    s.temp = +(s.temp + (Math.random() - .5) * 1.2 + (mid - s.temp) * .05).toFixed(1); // random drift, pulled gently to the middle
    s.hum = Math.max(30, Math.min(80, s.hum + Math.round((Math.random() - .5) * 4)));
    s.history.push(s.temp); if (s.history.length > 12) s.history.shift();
    // Create a new critical alert if the shipment leaves its safe range
    if (tempState(s) === 'critical' && !alerts.some(a => a.ship === s.id && !a.resolved)) {
      alerts.unshift({
        id: Date.now(), ship: s.id, type: s.temp > s.max ? 'High Temperature' : 'Low Temperature',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), sev: 'Critical', resolved: false
      });
      s.exc++; showToast('New critical alert: ' + s.id);
    }
  });
  vehicles.forEach(v => { if (v.status !== 'Idle') v.progress = Math.min(95, v.progress + Math.random() * 2); });
  renderAll();
}
function startTimer() { clearInterval(timer); timer = setInterval(simulate, interval); }


function updateProfile() {
  const name = prompt("Enter your new profile name:");

  if (name && name.trim() !== "") {
    document.querySelector(".user span").textContent = name.trim();
    document.querySelector(".user i").textContent =
      name.trim().charAt(0).toUpperCase();

    alert("Profile updated successfully!");
  }
}

// Downloads all shipment data as a CSV file
function exportCSV() {
  const head = ['ID', 'Product', 'Vehicle', 'From', 'To', 'Temperature (C)', 'Min (C)', 'Max (C)', 'Humidity (%)', 'Status'];
  const rows = shipments.map(s => [s.id, s.product, s.vehicle, s.from, s.to, s.temp, s.min, s.max, s.hum, s.status]);
  const csv = [head, ...rows].map(r => r.join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'shipment_report.csv'; a.click();
  showToast('Report downloaded');
}
function openShipment(id) {
  const s = shipments.find(x => x.id === id), st = tempState(s);
  openModal(`<h3>${s.product} (${s.id})</h3>${badge(s.status, statusColor[s.status])} ${badge(cap(st), stateColor[st])}
    <div class="kv"><div><small>Vehicle</small>${s.vehicle}</div><div><small>Route</small>${s.from} to ${s.to}</div>
    <div><small>Temperature</small>${fmt(s.temp)}</div><div><small>Allowed range</small>${fmt(s.min)} to ${fmt(s.max)}</div>
    <div><small>Humidity</small>${s.hum}%</div><div><small>Arrival</small>${s.eta}</div></div>
    <button class="btn primary" data-close>Close</button>`);
}
function openSettings() {
  openModal(`<h3>Settings</h3><label>Temperature unit<br><select id="setUnit"><option value="C">Celsius (°C)</option><option value="F" ${useF ? 'selected' : ''}>Fahrenheit (°F)</option></select></label><br><br>
    <label>Sensor update speed<br><select id="setSpeed"><option value="2000" ${interval === 2000 ? 'selected' : ''}>Every 2 seconds</option><option value="4000" ${interval === 4000 ? 'selected' : ''}>Every 4 seconds</option><option value="10000" ${interval === 10000 ? 'selected' : ''}>Every 10 seconds</option></select></label>
    <div class="kv"><button class="btn primary" data-save>Save settings</button><button class="btn" data-close>Cancel</button></div>`);
}

const navigationButtons = document.querySelectorAll(".nav-btn[data-view]");

navigationButtons.forEach(button => {
  button.addEventListener("click", function (event) {
    event.preventDefault();
    event.stopImmediatePropagation();

    const sectionId = this.getAttribute("data-view");
    const targetSection = document.getElementById(sectionId);

    if (targetSection) {
      targetSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }

    navigationButtons.forEach(nav => {
      nav.classList.remove("active");
    });

    this.classList.add("active");
  }, true);
});

// Highlight the sidebar item while scrolling
const pageSections = document.querySelectorAll(".view");

window.addEventListener("scroll", function () {
  let currentSection = "dashboard";

  pageSections.forEach(section => {
    const sectionTop = section.getBoundingClientRect().top;

    if (sectionTop <= 150) {
      currentSection = section.id;
    }
  });

  navigationButtons.forEach(button => {
    button.classList.toggle(
      "active",
      button.getAttribute("data-view") === currentSection
    );
  });
});

// ===== Button and click handling (one listener for the whole page) =====
document.addEventListener('click', e => {
  const t = e.target, el = sel => t.closest(sel);
  if (el('[data-view]')) showView(el('[data-view]').dataset.view);
  if (el('[data-open]')) openShipment(el('[data-open]').dataset.open);
  if (el('[data-filter]')) {
    filter = el('[data-filter]').dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(b => b.classList.toggle('active', b.dataset.filter === filter));
    renderShipments();
  }
  if (el('[data-resolve]')) { // resolving an alert also brings the shipment back to a safe temperature
    const a = alerts.find(x => x.id === +el('[data-resolve]').dataset.resolve), s = shipments.find(x => x.id === a.ship);
    a.resolved = true; s.temp = +((s.min + s.max) / 2).toFixed(1); s.history.push(s.temp); s.history.shift();
    renderAll(); showToast('Alert resolved for ' + a.ship);
  }
  if (el('[data-save]')) {
    useF = $('setUnit').value === 'F'; interval = +$('setSpeed').value;
    $('tempCards').innerHTML = ''; startTimer(); renderAll(); closeModal(); showToast('Settings saved');
  }
  if (el('[data-close]') || t === $('modal')) closeModal();
  if (!el('.notif-wrap')) $('notifPanel').classList.remove('open');
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
$('bellBtn').onclick = () => $('notifPanel').classList.toggle('open');
$('settingsBtn').onclick = openSettings;
$('exportBtn').onclick = exportCSV;
$('menuBtn').onclick = () => $('app').classList.toggle(innerWidth <= 900 ? 'open' : 'collapsed');
$('searchInput').oninput = () => { showView('shipments'); renderShipments(); };
$('dateFilter').onchange = renderShipments;
$('chartSelect').onchange = e => { chartId = e.target.value; drawChart(); };
$('refreshBtn').onclick = () => { // shows a spinner, then simulates a new sensor reading
  $('refreshBtn').classList.add('loading'); $('content').classList.add('loading');
  setTimeout(() => { simulate(); $('refreshBtn').classList.remove('loading'); $('content').classList.remove('loading'); showToast('Sensor readings updated'); }, 900);
};
window.onresize = drawChart;


// ===== Start the app =====
$('chartSelect').innerHTML = shipments.filter(s => s.status !== 'Delivered').map(s => `<option value="${s.id}">${s.product} (${s.id})</option>`).join('');
renderAll();
startTimer();


const profileDialog = document.getElementById("profileDialog");

const updateProfileBtn = document.getElementById("updateProfileBtn");
const closeProfile = document.getElementById("closeProfile");
const cancelProfile = document.getElementById("cancelProfile");

const profileForm = document.getElementById("profileForm");

const profileFullName = document.getElementById("profileFullName");
const profileEmail = document.getElementById("profileEmail");

const profileName = document.getElementById("profileName");
const profileInitial = document.getElementById("profileInitial");
const profileAvatar = document.getElementById("profileAvatar");

// Load saved profile
profileFullName.value =
  localStorage.getItem("adminName") || "Mohamed";

profileEmail.value =
  localStorage.getItem("adminEmail") || "admin@coldchain.com";

function updateProfileDisplay() {
  const name = profileFullName.value.trim();
  const initial = name.charAt(0).toUpperCase();

  profileName.textContent = name;
  profileInitial.textContent = initial;
  profileAvatar.textContent = initial;
}

// Open dialog
updateProfileBtn.addEventListener("click", function () {
  profileFullName.value =
    localStorage.getItem("adminName") || "Mohamed";

  profileEmail.value =
    localStorage.getItem("adminEmail") || "admin@coldchain.com";

  updateProfileDisplay();
  profileDialog.showModal();
});

// Close dialog
closeProfile.addEventListener("click", () => {
  profileDialog.close();
});

cancelProfile.addEventListener("click", () => {
  profileDialog.close();
});

// Update avatar while typing
profileFullName.addEventListener("input", updateProfileDisplay);

// Save profile
profileForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const name = profileFullName.value.trim();
  const email = profileEmail.value.trim();

  if (!name || !email) {
    alert("Please fill in all fields.");
    return;
  }

  localStorage.setItem("adminName", name);
  localStorage.setItem("adminEmail", email);

  updateProfileDisplay();

  profileDialog.close();

  alert("Profile updated successfully!");
});
