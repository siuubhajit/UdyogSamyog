/**
 * Fire Prevention & Life Safety Water Storage & Pump Sizing Calculator
 */

function renderFireCalculator(container) {
  if (!container) return;
  container.innerHTML = `
    <div class="calculator-card">
      <div class="calculator-header">
        <div class="calculator-icon">🚒</div>
        <div>
          <h4 class="calculator-title">Fire Water Storage &amp; Hydrant Pump Tool</h4>
          <p class="calculator-subtitle">Compute statutory underground static reservoir capacity and fire pump discharge ratings under Maharashtra Fire Prevention and Life Safety Measures Act.</p>
        </div>
      </div>
      <div class="calculator-grid">
        <label class="form-label">
          <span>Industrial Fire Hazard Grading</span>
          <select id="calcHazardGrading" class="form-control">
            <option value="low">Low Hazard (Light Engineering / Assembly)</option>
            <option value="medium" selected>Medium Hazard (Warehousing / General Manufacturing)</option>
            <option value="high">High Hazard (Chemical / Flammables / Distilleries)</option>
          </select>
        </label>
        <label class="form-label">
          <span>Total Covered Plinth Area (Sq. Metres)</span>
          <input type="number" id="calcBuiltUpArea" class="form-control" value="3500" min="500" step="100" />
        </label>
      </div>
      <div class="calculator-results">
        <div class="result-box">
          <span class="result-label">Dedicated Fire Water Underground Reservoir</span>
          <span class="result-value" id="calcStaticTank">100 kL</span>
          <span class="result-note">Exclusively reserved for firefighting with auto-replenishment</span>
        </div>
        <div class="result-box">
          <span class="result-label">Main Electric Fire Hydrant Pump Rating</span>
          <span class="result-value" id="calcPumpRating">2280 LPM @ 7 bar</span>
          <span class="result-note">Standby diesel engine pump of identical capacity mandatory</span>
        </div>
      </div>
    </div>
  `;

  function calculate() {
    const hazard = document.getElementById("calcHazardGrading")?.value || "medium";
    const builtUp = parseFloat(document.getElementById("calcBuiltUpArea")?.value) || 3000;

    let tankKl = 100;
    let pumpLpm = 2280;

    if (hazard === "low") {
      tankKl = builtUp > 5000 ? 100 : 50;
      pumpLpm = 1620;
    } else if (hazard === "medium") {
      tankKl = builtUp > 5000 ? 150 : 100;
      pumpLpm = 2280;
    } else {
      tankKl = builtUp > 5000 ? 250 : 200;
      pumpLpm = 4500;
    }

    const tankEl = document.getElementById("calcStaticTank");
    if (tankEl) tankEl.textContent = `${tankKl} kL (Underground)`;

    const pumpEl = document.getElementById("calcPumpRating");
    if (pumpEl) pumpEl.textContent = `${pumpLpm} LPM @ 7 bar`;
  }

  document.getElementById("calcHazardGrading")?.addEventListener("change", calculate);
  document.getElementById("calcBuiltUpArea")?.addEventListener("input", calculate);
  calculate();
}

if (typeof window !== "undefined") {
  window.renderFireCalculator = renderFireCalculator;
}

