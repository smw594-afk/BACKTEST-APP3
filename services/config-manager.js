// services/config-manager.js
// 슬롯 설정 및 시뮬레이션 관리

const configManager = {
  // 초기화 함수
  init() {
    // script.js에서 window.slotConfigs 등을 먼저 초기화하므로 여기서는 참조만 함
    if (!window.slotConfigs) window.slotConfigs = Array(MAX_SLOTS + 1).fill(null);
    if (!window.simulationConfigs) window.simulationConfigs = Array(MAX_SLOTS + 1).fill(null);
  },

  // 슬롯 활성화 여부 확인
  isSlotActive(num) {
    if (num < 1 || num > MAX_SLOTS) return false;
    return !!window.slotConfigs[num];
  },

  // 슬롯 설정 조회
  getSlotConfig(num) {
    if (num < 1 || num > MAX_SLOTS) return null;
    return window.slotConfigs[num];
  },

  // 슬롯 설정 저장
  setSlotConfig(num, config) {
    if (num < 1 || num > MAX_SLOTS) return;
    window.slotConfigs[num] = config;
  },

  // 현재 폼 입력을 슬롯에 저장
  saveCurrentFormToSlot(slotNum) {
    const ticker = document.getElementById('ticker')?.value || 'SOXL';
    const strategy = document.getElementById('strategySelect')?.value || '';
    const startDate = document.getElementById('startDate')?.value || '';
    const endDate = document.getElementById('endDate')?.value || '';
    const initialCash = document.getElementById('initialCash')?.value || '';
    const fBase = parseFloat(document.getElementById('fBase')?.value || 0);
    const renewCash = document.getElementById('renewCash')?.value || '';
    const fSec = parseFloat(document.getElementById('fSec')?.value || 0);

    const config = {
      basics: { ticker, strategy },
      dates: { startDate, endDate },
      capitals: { initialCash, renewCash },
      fees: { base: fBase, sec: fSec }
    };

    this.setSlotConfig(slotNum, config);
    localStorage.setItem(`vtotal3_conf${slotNum}_${myUserId}`, JSON.stringify(config));
  },

  // 슬롯 설정을 폼에 로드
  loadSlotToForm(slotNum) {
    const config = this.getSlotConfig(slotNum);
    if (!config) return;

    const ticker = config.basics?.ticker || 'SOXL';
    const strategy = config.basics?.strategy || '';
    const startDate = config.dates?.startDate || '';
    const endDate = config.dates?.endDate || '';
    const initialCash = config.capitals?.initialCash || '';
    const fBase = config.fees?.base || 0;
    const renewCash = config.capitals?.renewCash || '';
    const fSec = config.fees?.sec || 0;

    const tickerEl = document.getElementById('ticker');
    const strategyEl = document.getElementById('strategySelect');
    const startDateEl = document.getElementById('startDate');
    const endDateEl = document.getElementById('endDate');
    const initialCashEl = document.getElementById('initialCash');
    const fBaseEl = document.getElementById('fBase');
    const renewCashEl = document.getElementById('renewCash');
    const fSecEl = document.getElementById('fSec');

    if (tickerEl) tickerEl.value = ticker;
    if (strategyEl) strategyEl.value = strategy;
    if (startDateEl) startDateEl.value = startDate;
    if (endDateEl) endDateEl.value = endDate;
    if (initialCashEl) initialCashEl.value = initialCash;
    if (fBaseEl) fBaseEl.value = fBase;
    if (renewCashEl) renewCashEl.value = renewCash;
    if (fSecEl) fSecEl.value = fSec;
  },

  // 슬롯 로컬 비활성화 여부 확인
  isSlotLocallyDisabled(slotNum, userId = myUserId) {
    const key = this.getSlotDisabledKey(slotNum, userId);
    return localStorage.getItem(key) === 'true';
  },

  // 슬롯 로컬 비활성화 설정
  setSlotLocallyDisabled(slotNum, disabled, userId = myUserId) {
    const key = this.getSlotDisabledKey(slotNum, userId);
    localStorage.setItem(key, disabled ? 'true' : 'false');
  },

  // 슬롯 비활성화 키 조회
  getSlotDisabledKey(slotNum, userId = myUserId) {
    return `vtotal3_slot${slotNum}_disabled_${userId}`;
  },

  // 시트에서 로드한 설정을 슬롯에 적용
  applySheetConfigToSlot(slotNum, confData) {
    if (!confData) return;
    this.setSlotConfig(slotNum, confData);
  },

  // 헤더 표시 업데이트
  updateHeaderDisplay() {
    const header = document.getElementById('userDisplayHeader');
    if (!header) return;

    let headerText = myUserId || 'User';
    const activeSlots = [];

    for (let i = 1; i <= MAX_SLOTS; i++) {
      if (this.isSlotActive(i) && !this.isSlotLocallyDisabled(i)) {
        const cfg = this.getSlotConfig(i);
        if (cfg?.basics?.strategy) {
          activeSlots.push(`${i}: ${cfg.basics.strategy}`);
        }
      }
    }

    if (activeSlots.length > 0) {
      headerText += ` (${activeSlots.join(', ')})`;
    }

    header.innerText = headerText;
  }
};

// 전역 호환성
window.configManager = configManager;

// 래퍼 함수들 (기존 코드와의 호환성)
window.isSlotActive = (num) => configManager.isSlotActive(num);
window.getSlotConfig = (num) => configManager.getSlotConfig(num);
window.saveCurrentFormToSlot = (slotNum) => configManager.saveCurrentFormToSlot(slotNum);
window.loadSlotToForm = (slotNum) => configManager.loadSlotToForm(slotNum);
window.isSlotLocallyDisabled = (slotNum, userId) => configManager.isSlotLocallyDisabled(slotNum, userId);
window.setSlotLocallyDisabled = (slotNum, disabled, userId) => configManager.setSlotLocallyDisabled(slotNum, disabled, userId);
window.getSlotDisabledKey = (slotNum, userId) => configManager.getSlotDisabledKey(slotNum, userId);
window.applySheetConfigToSlot = (slotNum, confData) => configManager.applySheetConfigToSlot(slotNum, confData);
window.updateHeaderDisplay = () => configManager.updateHeaderDisplay();
