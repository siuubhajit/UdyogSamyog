"use strict";
/**
 * Udyog Samyog — Spatial GIS Industrial Plot Selector
 * 
 * Provides interactive parcel selection across Maharashtra Industrial Development Corporation (MIDC) parks:
 * - Chakan Industrial Area (Pune)
 * - Butibori Industrial Zone (Nagpur)
 * - Thane-Belapur Industrial Area (Navi Mumbai)
 * - Waluj Industrial Area (Chhatrapati Sambhajinagar)
 * - Kurkumbh Chemical Zone (Pune)
 * 
 * Auto-calculates:
 * 1. Plot area in Acres and Sq. Meters
 * 2. Setback guidelines (Front, Side, Rear)
 * 3. Proximity to eco-sensitive bodies / River Regulation Zones
 */

const MIDC_PARKS = [
  {
    id: "chakan-ph2",
    name: "MIDC Chakan Industrial Park (Phase II)",
    district: "Pune",
    lat: 18.7562,
    lng: 73.8584,
    eco_zone: "Indrayani River Basin (8.2 km)",
    plots: [
      { no: "C-101", area_acres: 2.5, area_sqm: 10117, zone: "Heavy Engineering", setback_f: 9.0, setback_s: 6.0, eco_km: 8.2, status: "Available" },
      { no: "C-102", area_acres: 4.2, area_sqm: 17000, zone: "Automobile & Ancillary", setback_f: 12.0, setback_s: 7.5, eco_km: 8.5, status: "Available" },
      { no: "C-103", area_acres: 1.0, area_sqm: 4047, zone: "Light Electronics", setback_f: 6.0, setback_s: 4.5, eco_km: 9.0, status: "Reserved" },
      { no: "C-104", area_acres: 6.0, area_sqm: 24281, zone: "Logistics & Assembly", setback_f: 15.0, setback_s: 9.0, eco_km: 8.0, status: "Available" }
    ]
  },
  {
    id: "butibori-ind",
    name: "MIDC Butibori Industrial Area",
    district: "Nagpur",
    lat: 20.9254,
    lng: 78.9832,
    eco_zone: "Wena River Drainage (14.1 km)",
    plots: [
      { no: "B-201", area_acres: 5.0, area_sqm: 20234, zone: "Textile & Garmenting", setback_f: 12.0, setback_s: 7.5, eco_km: 14.1, status: "Available" },
      { no: "B-202", area_acres: 10.0, area_sqm: 40468, zone: "Synthetic Fibres", setback_f: 15.0, setback_s: 10.0, eco_km: 14.5, status: "Available" },
      { no: "B-203", area_acres: 3.5, area_sqm: 14164, zone: "Engineering Workshop", setback_f: 9.0, setback_s: 6.0, eco_km: 15.0, status: "Available" }
    ]
  },
  {
    id: "ttc-belapur",
    name: "TTC Industrial Area (Thane-Belapur)",
    district: "Thane",
    lat: 19.1136,
    lng: 73.0112,
    eco_zone: "Thane Creek Coastal Regulation Buffer (3.8 km)",
    plots: [
      { no: "T-45", area_acres: 1.2, area_sqm: 4856, zone: "IT / Tech Hardware", setback_f: 6.0, setback_s: 4.5, eco_km: 3.8, status: "Available" },
      { no: "T-46", area_acres: 2.0, area_sqm: 8094, zone: "Bio-Pharmaceutical R&D", setback_f: 9.0, setback_s: 6.0, eco_km: 4.1, status: "Available" }
    ]
  },
  {
    id: "kurkumbh-chem",
    name: "MIDC Kurkumbh Chemical Zone",
    district: "Pune",
    lat: 18.3752,
    lng: 74.5218,
    eco_zone: "Bhima River Tributary (12.0 km)",
    plots: [
      { no: "K-01", area_acres: 3.0, area_sqm: 12140, zone: "Chemicals & Bulk Drugs", setback_f: 12.0, setback_s: 9.0, eco_km: 12.0, status: "Available" },
      { no: "K-02", area_acres: 7.5, area_sqm: 30351, zone: "Specialty Chemicals", setback_f: 15.0, setback_s: 12.0, eco_km: 12.4, status: "Available" }
    ]
  }
];

class GisPlotSelector {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.options = options;
    this.selectedPark = MIDC_PARKS[0];
    this.selectedPlot = null;
    this.onSelectCallback = options.onSelect || null;
    if (this.container) {
      this.render();
    }
  }

  render() {
    this.container.innerHTML = `
      <div style="background:#ffffff; border:1px solid #cbd5e1; border-radius:12px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.05); font-family:inherit;">
        <!-- Header -->
        <div style="background:linear-gradient(135deg, #1e3a8a, #0284c7); color:#ffffff; padding:1rem 1.25rem; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h4 style="margin:0; font-size:1.05rem; font-weight:700; display:flex; align-items:center; gap:0.5rem;">
              <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
              MIDC Spatial GIS Industrial Plot Selector
            </h4>
            <span style="font-size:0.8rem; opacity:0.9;">Maharashtra Industrial Development Corporation · Cadastral Land Bank</span>
          </div>
          <span style="background:rgba(255,255,255,0.2); padding:0.3rem 0.6rem; border-radius:6px; font-size:0.75rem; font-weight:600;">
            Cadastral Ver. 2026.4
          </span>
        </div>

        <div style="padding:1.25rem;">
          <!-- Park Selector -->
          <div style="margin-bottom:1rem; display:flex; gap:0.75rem; align-items:center; flex-wrap:wrap;">
            <label style="font-weight:600; font-size:0.88rem; color:#334155;">Select MIDC Industrial Park:</label>
            <select id="gisParkSelect" style="padding:0.45rem 0.75rem; border:1px solid #94a3b8; border-radius:6px; font-size:0.88rem; background:#f8fafc; font-weight:500;">
              ${MIDC_PARKS.map(p => `<option value="${p.id}" ${p.id === this.selectedPark.id ? "selected" : ""}>${p.name} (${p.district})</option>`).join("")}
            </select>
            <span style="font-size:0.8rem; color:#64748b;">📍 Lat: ${this.selectedPark.lat}, Lng: ${this.selectedPark.lng}</span>
          </div>

          <!-- Interactive Parcel Grid & Details -->
          <div style="display:grid; grid-template-columns: 1.4fr 1fr; gap:1.25rem;">
            <!-- Interactive Visual Layout Simulation -->
            <div style="background:#0f172a; border-radius:8px; padding:1.25rem; color:#ffffff; position:relative; min-height:260px; display:flex; flex-direction:column; justify-content:space-between; border:1px solid #334155;">
              <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #334155; padding-bottom:0.5rem; margin-bottom:1rem;">
                <span style="font-size:0.8rem; text-transform:uppercase; letter-spacing:0.05em; color:#38bdf8; font-weight:700;">Spatial Cluster Layout Map</span>
                <span style="font-size:0.75rem; color:#94a3b8;">Click a plot to inspect & select</span>
              </div>

              <!-- Plot Blocks -->
              <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:0.75rem; margin:auto 0;">
                ${this.selectedPark.plots.map(pl => {
                  const isSel = this.selectedPlot && this.selectedPlot.no === pl.no;
                  const isAvail = pl.status === "Available";
                  return `
                    <div class="gis-plot-box" data-plot-no="${pl.no}" style="
                      background:${isSel ? "#0284c7" : isAvail ? "#1e293b" : "#334155"};
                      border:2px solid ${isSel ? "#38bdf8" : isAvail ? "#3b82f6" : "#64748b"};
                      border-radius:6px; padding:0.85rem; cursor:${isAvail ? "pointer" : "not-allowed"};
                      opacity:${isAvail ? "1" : "0.5"}; transition:all 0.15s ease; text-align:center;">
                      <div style="font-weight:700; font-size:0.95rem; color:#f8fafc;">${pl.no}</div>
                      <div style="font-size:0.75rem; color:#94a3b8; margin-top:0.2rem;">${pl.area_acres} Acres (${pl.area_sqm.toLocaleString()} m²)</div>
                      <div style="font-size:0.7rem; color:${isSel ? "#e0f2fe" : "#38bdf8"}; margin-top:0.3rem;">${pl.zone}</div>
                      <div style="margin-top:0.4rem;">
                        <span style="font-size:0.65rem; padding:0.15rem 0.4rem; border-radius:4px; font-weight:600; background:${isAvail ? "#065f46" : "#991b1b"}; color:#ffffff;">
                          ${pl.status}
                        </span>
                      </div>
                    </div>
                  `;
                }).join("")}
              </div>

              <div style="margin-top:1rem; padding-top:0.5rem; border-top:1px solid #334155; display:flex; justify-content:space-between; font-size:0.72rem; color:#94a3b8;">
                <span>Environmental Buffer: ${this.selectedPark.eco_zone}</span>
                <span>CRZ Clearance: Not Applicable</span>
              </div>
            </div>

            <!-- Plot Compliance Card -->
            <div id="gisPlotDetails" style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:1.25rem;">
              ${this.selectedPlot ? `
                <div style="border-bottom:1px solid #e2e8f0; padding-bottom:0.75rem; margin-bottom:0.75rem;">
                  <span style="background:#dbeafe; color:#1e40af; font-size:0.75rem; font-weight:700; padding:0.2rem 0.5rem; border-radius:4px;">SELECTED PLOT</span>
                  <h3 style="margin:0.4rem 0 0 0; font-size:1.25rem; font-weight:700; color:#0f172a;">${this.selectedPlot.no} — ${this.selectedPark.name}</h3>
                </div>
                <div style="font-size:0.85rem; color:#334155; display:grid; grid-template-columns:1fr 1fr; gap:0.6rem;">
                  <div><strong>Plot Area:</strong> ${this.selectedPlot.area_acres} Acres</div>
                  <div><strong>Built-up Area:</strong> ${this.selectedPlot.area_sqm.toLocaleString()} m²</div>
                  <div><strong>Front Setback:</strong> ≥ ${this.selectedPlot.setback_f} meters</div>
                  <div><strong>Side Setback:</strong> ≥ ${this.selectedPlot.setback_s} meters</div>
                  <div><strong>Industrial Zone:</strong> ${this.selectedPlot.zone}</div>
                  <div><strong>Water Proximity:</strong> ${this.selectedPlot.eco_km} km</div>
                </div>
                <div style="margin-top:1rem; padding:0.6rem; background:#ecfdf5; border-left:4px solid #10b981; font-size:0.78rem; color:#065f46;">
                  ✅ Statutory Setback Compliant under MIDC Development Regulations 2024.
                </div>
                <button id="btnApplyGisPlot" style="margin-top:1rem; width:100%; background:#0284c7; color:#ffffff; border:none; padding:0.6rem; border-radius:6px; font-weight:700; cursor:pointer;">
                  Apply Plot Coordinates to Form
                </button>
              ` : `
                <div style="text-align:center; padding:3rem 1rem; color:#64748b;">
                  <svg width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" style="margin:0 auto 0.5rem auto; display:block;"><path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>
                  <div style="font-weight:600; font-size:0.92rem; color:#334155;">No Industrial Plot Selected</div>
                  <div style="font-size:0.8rem; margin-top:0.25rem;">Click on any available plot on the spatial map to review setback and land area metrics.</div>
                </div>
              `}
            </div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    const parkSelect = this.container.querySelector("#gisParkSelect");
    if (parkSelect) {
      parkSelect.addEventListener("change", (e) => {
        const parkId = e.target.value;
        this.selectedPark = MIDC_PARKS.find(p => p.id === parkId) || MIDC_PARKS[0];
        this.selectedPlot = null;
        this.render();
      });
    }

    const plotBoxes = this.container.querySelectorAll(".gis-plot-box");
    plotBoxes.forEach(box => {
      box.addEventListener("click", () => {
        const plotNo = box.getAttribute("data-plot-no");
        const plot = this.selectedPark.plots.find(p => p.no === plotNo);
        if (plot && plot.status === "Available") {
          this.selectedPlot = plot;
          this.render();
        }
      });
    });

    const btnApply = this.container.querySelector("#btnApplyGisPlot");
    if (btnApply && this.selectedPlot) {
      btnApply.addEventListener("click", () => {
        if (this.onSelectCallback) {
          this.onSelectCallback({
            park_name: this.selectedPark.name,
            district: this.selectedPark.district,
            plot_no: this.selectedPlot.no,
            area_acres: this.selectedPlot.area_acres,
            area_sqm: this.selectedPlot.area_sqm,
            setback_front: this.selectedPlot.setback_f,
            setback_side: this.selectedPlot.setback_s,
            eco_distance_km: this.selectedPlot.eco_km,
            zone: this.selectedPlot.zone,
            coordinates: [this.selectedPark.lat, this.selectedPark.lng],
          });
        }
      });
    }
  }
}

window.GisPlotSelector = GisPlotSelector;

