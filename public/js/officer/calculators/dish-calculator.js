/**
 * DISH Worker Air Space & Ventilation Calculator
 */

function renderDishCalculator(container) {
  if (!container) return;
  container.innerHTML = `
    <div class="calculator-card">
      <div class="calculator-header">
        <div class="calculator-icon">👷</div>
        <div>
          <h4 class="calculator-title">Worker Air Space &amp; Ventilation Tool</h4>
          <p class="calculator-subtitle">Compute factory shop floor volumetric air capacity under Section 16 of the Factories Act 1948 (min 14.2 m³ per shift worker).</p>
        </div>
      </div>
      <div class="calculator-grid">
        <label class="form-label">
          <span>Factory Floor Enclosed Area (Sq. Metres)</span>
          <input type="number" id="calcHallArea" class="form-control" value="850" min="50" step="10" />
        </label>
        <label class="form-label">
          <span>Internal Ceiling Clear Height (Metres)</span>
          <input type="number" id="calcCeilingHeight" class="form-control" value="4.8" min="3.0" max="15.0" step="0.1" />
        </label>
        <label class="form-label">
          <span>Max Shift Workers Present</span>
          <input type="number" id="calcShiftWorkers" class="form-control" value="65" min="1" step="1" />
        </label>
      </div>
      <div class="calculator-results">
        <div class="result-box">
          <span class="result-label">Available Air Space per Worker</span>
          <span class="result-value" id="calcVolumePerWorker">54.9 m³</span>
          <span class="result-note">Statutory statutory minimum is 14.2 m³ (height capped at 4.2m)</span>
        </div>
        <div class="result-box">
          <span class="result-label">Maximum Statutory Shift Occupancy</span>
          <span class="result-value" id="calcMaxWorkers">251 Workers</span>
          <span class="result-note">Safe occupational ceiling for this hall volume</span>
        </div>
      </div>
    </div>
  `;

  function calculate() {
    const area =
      parseFloat(document.getElementById("calcHallArea")?.value) || 800;
    const height =
      parseFloat(document.getElementById("calcCeilingHeight")?.value) || 4.5;
    const workers =
      parseInt(document.getElementById("calcShiftWorkers")?.value, 10) || 40;

    const effHeight = Math.min(4.2, height);
    const totalVolume = area * effHeight;
    const volumePerWorker = (totalVolume / Math.max(1, workers)).toFixed(1);

    const isCompliant = parseFloat(volumePerWorker) >= 14.2;
    const maxAllowedWorkers = Math.floor(totalVolume / 14.2);

    const volEl = document.getElementById("calcVolumePerWorker");
    if (volEl) {
      volEl.textContent = `${volumePerWorker} m³ / worker (Min: 14.2 m³)`;
      volEl.style.color = isCompliant
        ? "var(--color-success, var(--ok-ink))"
        : "var(--color-danger, var(--err-ink))";
    }

    const maxWEl = document.getElementById("calcMaxWorkers");
    if (maxWEl) {
      maxWEl.textContent = `${maxAllowedWorkers} Workers Max`;
    }
  }

  document.getElementById("calcHallArea")?.addEventListener("input", calculate);
  document
    .getElementById("calcCeilingHeight")
    ?.addEventListener("input", calculate);
  document
    .getElementById("calcShiftWorkers")
    ?.addEventListener("input", calculate);
  calculate();
}

if (typeof window !== "undefined") {
  window.renderDishCalculator = renderDishCalculator;
}
