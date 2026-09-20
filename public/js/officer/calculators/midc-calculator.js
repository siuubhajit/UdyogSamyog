/**
 * MIDC Floor Space Index (FSI) & Ground Coverage Calculator
 */

function renderMidcCalculator(container) {
  if (!container) return;
  container.innerHTML = `
    <div class="calculator-card">
      <div class="calculator-header">
        <div class="calculator-icon">📐</div>
        <div>
          <h4 class="calculator-title">Floor Space Index &amp; Setback Tool</h4>
          <p class="calculator-subtitle">Verify architectural floor space index (FAR/FSI), ground coverage, and required marginal setbacks under MIDC DCR rules.</p>
        </div>
      </div>
      <div class="calculator-grid">
        <label class="form-label">
          <span>Industrial Plot Area (Sq. Metres)</span>
          <input type="number" id="calcPlotArea" class="form-control" value="5000" min="100" step="50" />
        </label>
        <label class="form-label">
          <span>Proposed Total Built-Up Area (Sq. Metres)</span>
          <input type="number" id="calcBuiltUp" class="form-control" value="3800" min="50" step="50" />
        </label>
      </div>
      <div class="calculator-results">
        <div class="result-box">
          <span class="result-label">Consumed FSI / Permissible Limit</span>
          <span class="result-value" id="calcConsumedFar">0.76 / 1.00</span>
          <span class="result-note">Statutory MIDC basic FSI ceiling is 1.00</span>
        </div>
        <div class="result-box">
          <span class="result-label">Ground Footprint Coverage</span>
          <span class="result-value" id="calcCoverage">38.0%</span>
          <span class="result-note">Maximum allowable ground coverage is 50.0%</span>
        </div>
      </div>
    </div>
  `;

  function calculate() {
    const plotArea = parseFloat(document.getElementById("calcPlotArea")?.value) || 2000;
    const builtUp = parseFloat(document.getElementById("calcBuiltUp")?.value) || 1800;

    const consumedFar = (builtUp / plotArea).toFixed(2);
    const maxFar = 1.0;
    const coveragePercent = Math.min(100, ((builtUp / 2 / plotArea) * 100).toFixed(1));

    const farEl = document.getElementById("calcConsumedFar");
    if (farEl) {
      farEl.textContent = `${consumedFar} / ${maxFar}`;
      farEl.style.color = parseFloat(consumedFar) <= maxFar ? "var(--color-success, #059669)" : "var(--color-danger, #dc2626)";
    }

    const covEl = document.getElementById("calcCoverage");
    if (covEl) {
      covEl.textContent = `${coveragePercent}%`;
    }
  }

  document.getElementById("calcPlotArea")?.addEventListener("input", calculate);
  document.getElementById("calcBuiltUp")?.addEventListener("input", calculate);
  calculate();
}

if (typeof window !== "undefined") {
  window.renderMidcCalculator = renderMidcCalculator;
}

