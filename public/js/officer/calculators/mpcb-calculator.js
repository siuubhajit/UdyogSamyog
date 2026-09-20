/**
 * MPCB Effluent & Air Dispersion Calculator
 */

function renderMpcbCalculator(container) {
  if (!container) return;
  container.innerHTML = `
    <div class="calculator-card">
      <div class="calculator-header">
        <div class="calculator-icon">🧪</div>
        <div>
          <h4 class="calculator-title">Effluent Sizing &amp; Air Dispersion Tool</h4>
          <p class="calculator-subtitle">Estimate required ETP hydraulic capacity (KLD) and statutory SO2 stack height standards under Water &amp; Air Acts.</p>
        </div>
      </div>
      <div class="calculator-grid">
        <label class="form-label">
          <span>Industrial Fresh Water Consumption (KLD)</span>
          <input type="number" id="calcWaterUse" class="form-control" value="25" min="1" step="1" />
        </label>
        <label class="form-label">
          <span>SO₂ Fuel Emission Rate (kg/hr)</span>
          <input type="number" id="calcSo2Rate" class="form-control" value="8" min="0.5" step="0.5" />
        </label>
      </div>
      <div class="calculator-results">
        <div class="result-box">
          <span class="result-label">Recommended ETP Capacity</span>
          <span class="result-value" id="calcEtpCapacity">24 KLD</span>
          <span class="result-note">80% generation + 20% hydraulic surge reserve</span>
        </div>
        <div class="result-box">
          <span class="result-label">Statutory Minimum Chimney Stack Height</span>
          <span class="result-value" id="calcStackHeight">26.1 Meters</span>
          <span class="result-note">Formula: H = 14 &times; (Q_SO₂)^0.3</span>
        </div>
      </div>
    </div>
  `;

  function calculate() {
    const water = parseFloat(document.getElementById("calcWaterUse")?.value) || 10;
    const so2 = parseFloat(document.getElementById("calcSo2Rate")?.value) || 5;

    const etpCapacity = Math.ceil(water * 0.8 * 1.2);
    const stackHeight = Math.max(15, (14 * Math.pow(so2, 0.3)).toFixed(1));

    const etpEl = document.getElementById("calcEtpCapacity");
    if (etpEl) etpEl.textContent = `${etpCapacity} KLD`;

    const stackEl = document.getElementById("calcStackHeight");
    if (stackEl) stackEl.textContent = `${stackHeight} Meters`;
  }

  document.getElementById("calcWaterUse")?.addEventListener("input", calculate);
  document.getElementById("calcSo2Rate")?.addEventListener("input", calculate);
  calculate();
}

if (typeof window !== "undefined") {
  window.renderMpcbCalculator = renderMpcbCalculator;
}

