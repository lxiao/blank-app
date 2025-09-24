(function () {
  const powerToggle = document.getElementById('powerToggle');
  const itEl = document.querySelector('.powerbar-it');
  const ohEl = document.querySelector('.powerbar-overhead');
  const itLoadMwEl = document.getElementById('itLoadMw');
  const facilityEnergyGwhEl = document.getElementById('facilityEnergyGwh');
  const homesYearEl = document.getElementById('homesYear');
  const audioToggle = document.getElementById('audioToggle');
  const assumptionsBtn = document.getElementById('assumptionsBtn');
  const assumptionsDialog = document.getElementById('assumptionsDialog');
  const assumptionsClose = document.getElementById('assumptionsClose');

  const YEAR_EL = document.getElementById('year');
  if (YEAR_EL) YEAR_EL.textContent = String(new Date().getFullYear());

  // Constants
  const NUM_GPUS = 16384;
  const TRAIN_DAYS = 54;
  const PUE = 1.2;
  const HOME_KWH_PER_YEAR = 10500; // US average
  const HOURS_PER_DAY = 24;
  const IT_COLOR_RATIO = 1 / PUE; // fraction of facility energy that is IT

  // Audio
  let humAudio; let audioEnabled = false; let userInteracted = false;
  function ensureAudio() {
    if (!humAudio) {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = 50; // 50 Hz hum
      gain.gain.value = 0.0005; // very subtle
      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start();
      humAudio = { ctx, gain };
    }
  }

  function setAudio(on) {
    if (!humAudio) return;
    if (on) {
      humAudio.gain.gain.setTargetAtTime(0.002, humAudio.ctx.currentTime, 0.3);
    } else {
      humAudio.gain.gain.setTargetAtTime(0.00001, humAudio.ctx.currentTime, 0.2);
    }
  }

  // Scene 1 calculations
  function compute(powerPerGpuWatts) {
    const itLoadW = powerPerGpuWatts * NUM_GPUS; // watts
    const itLoadMW = itLoadW / 1e6; // MW
    const itEnergyMWh = itLoadMW * TRAIN_DAYS * HOURS_PER_DAY; // MWh
    const facilityEnergyMWh = itEnergyMWh * PUE;
    const facilityEnergyGWh = facilityEnergyMWh / 1000;
    const homesYear = (facilityEnergyMWh * 1000) / HOME_KWH_PER_YEAR; // convert MWh->kWh
    return { itLoadMW, facilityEnergyGWh, homesYear };
  }

  function formatNumber(n, digits = 1) {
    return Number(n).toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits });
  }

  function animatePowerbar(powerPerGpuWatts) {
    const { itLoadMW, facilityEnergyGWh, homesYear } = compute(powerPerGpuWatts);
    const itPct = IT_COLOR_RATIO * 100; // IT portion of facility bar
    const ohPct = (1 - IT_COLOR_RATIO) * 100; // overhead portion

    // Start from 0 for animation
    requestAnimationFrame(() => {
      itEl.style.width = itPct + '%';
      ohEl.style.width = ohPct + '%';
    });

    itLoadMwEl.textContent = formatNumber(itLoadMW, 1);
    facilityEnergyGwhEl.textContent = formatNumber(facilityEnergyGWh, 1);
    homesYearEl.textContent = Math.round(homesYear).toLocaleString();
  }

  function currentPowerSetting() {
    return powerToggle?.checked ? 700 : 350;
  }

  // Toggle handlers
  powerToggle?.addEventListener('change', () => {
    animatePowerbar(currentPowerSetting());
    if (audioEnabled) setAudio(true);
    // Update dialog expanded state label
    document.getElementById('assumptionsBtn')?.setAttribute('aria-expanded', assumptionsDialog?.open ? 'true' : 'false');
  });

  assumptionsBtn?.addEventListener('click', () => {
    if (!assumptionsDialog) return;
    if (typeof assumptionsDialog.showModal === 'function') {
      assumptionsDialog.showModal();
      assumptionsBtn.setAttribute('aria-expanded', 'true');
    } else {
      assumptionsDialog.setAttribute('open', 'true');
      assumptionsBtn.setAttribute('aria-expanded', 'true');
    }
  });
  assumptionsClose?.addEventListener('click', () => {
    if (!assumptionsDialog) return;
    assumptionsDialog.close();
    assumptionsBtn?.setAttribute('aria-expanded', 'false');
  });

  audioToggle?.addEventListener('click', () => {
    userInteracted = true; // Android/iOS autoplay policies
    ensureAudio();
    audioEnabled = !audioEnabled;
    setAudio(audioEnabled);
    audioToggle.textContent = audioEnabled ? 'Hum: On' : 'Hum: Off';
    audioToggle.setAttribute('aria-pressed', audioEnabled ? 'true' : 'false');
  });

  // Initialize Scene 1
  animatePowerbar(currentPowerSetting());

  // Scene 2: lollipop chart
  const lollipopSearch = document.getElementById('lollipopSearch');
  const lollipopChatGPT = document.getElementById('lollipopChatGPT');
  const lollipopCard = document.querySelector('.lollipop-card');
  function updateLollipop(el, maxValue) {
    if (!el) return;
    const value = parseFloat(el.dataset.value || '0');
    const pct = Math.min(100, (value / maxValue) * 100);
    el.style.setProperty('--pct', String(pct));
    el.classList.add('show');
  }
  function activateLollipop() {
    const maxValue = 3.2; // a bit above 2.9 for headroom
    updateLollipop(lollipopSearch, maxValue);
    setTimeout(() => updateLollipop(lollipopChatGPT, maxValue), 150);
    lollipopCard?.classList.add('active');
  }

  // Trigger on visibility
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        activateLollipop();
        io.disconnect();
      }
    });
  }, { threshold: 0.3 });
  if (lollipopCard) io.observe(lollipopCard);

  // Equivalences static
  const ledMinutes = document.getElementById('ledMinutes');
  if (ledMinutes) {
    // 2.9 Wh at 10 W = 0.29 h = 17.4 min
    const minutes = 2.9 / 10 * 60;
    ledMinutes.textContent = Math.round(minutes).toString();
  }
  const millionPromptsMWh = document.getElementById('millionPromptsMWh');
  const millionHomesDay = document.getElementById('millionHomesDay');
  if (millionPromptsMWh && millionHomesDay) {
    const mwh = 2.9; // 1,000,000 * 2.9 Wh = 2.9 MWh
    millionPromptsMWh.textContent = mwh.toFixed(1);
    const homesPerDay = (mwh * 1000) / (HOME_KWH_PER_YEAR / 365);
    millionHomesDay.textContent = Math.round(homesPerDay).toString();
  }

  // Calculator
  const promptsPerDayEl = document.getElementById('promptsPerDay');
  const perPromptWhEl = document.getElementById('perPromptWh');
  const dailyEnergyKwhEl = document.getElementById('dailyEnergyKwh');
  const homesPerDayEl = document.getElementById('homesPerDay');

  function updateCalculator() {
    const promptsPerDay = Math.max(0, Number(promptsPerDayEl?.value || 0));
    const perPromptWh = Math.max(0, Number(perPromptWhEl?.value || 0));
    const kWh = (promptsPerDay * perPromptWh) / 1000;
    dailyEnergyKwhEl.textContent = kWh.toFixed(1);
    const homesDay = kWh / (HOME_KWH_PER_YEAR / 365);
    homesPerDayEl.textContent = homesDay.toFixed(1);
  }
  promptsPerDayEl?.addEventListener('input', updateCalculator);
  perPromptWhEl?.addEventListener('input', updateCalculator);
  updateCalculator();
})();

