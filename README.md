# CMOS Sensor Lab — interactive engineering website

Five pages, static HTML/CSS/JavaScript/JSON. No external packages or internet needed.

## Run on Windows
1. Extract the ZIP to `projects_CIS/cmos-sensor-lab`.
2. Open a command prompt in that directory and run `python -m http.server 8000`.
3. Visit `http://localhost:8000`.

Linux/WSL: `python3 -m http.server 8000`. Do not open HTML via `file://`; JSON fetch and ES modules need HTTP.

## Test
`node tests/models.test.mjs` (Node.js required only for tests, not for running the site).

## Architecture
- `index.html`, `pages/*.html`: landing and five feature pages
- `css/styles.css`: common responsive styling
- `js/site.js`: shared navigation
- `js/models.js`: pure mathematical models
- `js/ui.js`: sliders, SVG plots, CSV export
- `js/{snr,pixel,cds,hdr,readout}.js`: page-specific interactions
- `config/sensor.json`: default lecture-8-style DCG parameters
- `MASTER_BUILD_PROMPT.md`: detailed production and verification prompt

## Audit / educational model notes
**SNR page**: Analog model assumes SF and bias noise BEFORE programmable analog gain, amplifier and ADC noise AFTER gain, and independent quantization error. All RMS voltages are referenced to the declared stage. Input-referred rms noise computed from stage-referred quadrature sum / (GSF·CG). Photon shot variance = n; PRNU variance = (fraction·n)^2. Individual high/low curves stop at min(PD FWC, ADC swing / (GSF·CG·analog gain)). Combined DCG picks HCG until clip and LCG thereafter. Dynamic range denominator is the solved SNR=1 input electron level (not simply the read-noise RMS). **The model has not been calibrated to reproduce 82.9 dB / 85.3 dB exactly.** Bias/amp noise placement is a modeling assumption; other implementation details can differ in the slides.

**4T page**: Charge accumulation is in PD during exposure, then transferred to FD. The plotted FD voltage is the **equivalent voltage after charge transfer**, versus assumed exposure time, not the literal FD node voltage during shutter operation. Assumes 100% transfer and no charge loss or headroom limits. Reset noise is a single-node kTC estimate at 300 K; CDS may cancel reset noise if samples are correlated appropriately.

**CDS page**: Pure ideal difference transfer `H(f)=1-e^{-j2πfT}`. Actual read noise depends on spectra and sample correlation, which are not integrated here. The displayed reset noise is a separate kTC estimate, not post-CDS residual.

**HDR page**: DCG uses the SNR-page model. Dual exposure uses simple independent shot + fixed electron read noise at two exposure times, and an ideal noiseless rescaling; no PRNU, motion or blending model.

**Readout page**: Analytical fps calculation and illustrative row markers; pulse widths, reset/TG timing, ADC/serializer throughput and multi-frame exposures are not fully scheduled.

## Document sources
Primary: Trygve Willassen, *IN5350/IN9350 CMOS Image Sensor Design — HDR* (2026), slides 5–10, 30–34, 46, 50–52. Baseline default values: CG 200/25 µV/e, GSF .85, PRNU .7%, Vref 640 mV, N=10, four listed 100 µV RMS analog noise contributions, FWC approximately 30ke, HCG analog gain 10.

Additional: IN5350 2025 pixel readout lectures (CG, ERS formula and noise), pixel architecture (4T and CDS), pixel process (FWC), and lecture 8 exercises. Technical prompt includes the 2021 Häfliger/Mikkelsen research paper as a future module reference.

These course materials are **reference sources**, not automatically validated against the simplified website implementation. To demonstrate lecture-level numeric agreement, identify every noise-reference point and saturation definition first.


## Digital Readout Lab — verified project extension

Open `pages/digital-readout.html` (or use the navigation sidebar) to explore the VHDL controller described in *Design and Verification of a Programmable CMOS Image Sensor Array Controller*, October 2026. It adds five experiments: clock-cycle waveforms, rolling-shutter sequencing, digital CDS/frame reconstruction, a constraint debugger and an architecture explorer.

**Source hierarchy:** the final report provides eight explicit timing fixtures and the default exposure start/stop events. It does **not** specify every RTL clock edge in each pulse. Consequently, browser-created RST/TG/SEL waveforms show illustrative sequential phases and are never labeled observed RTL traces. The default exposure events (21,37,53,69 → 85,101,117,133), 160-cycle frame, 64-cycle exposure and readout order 0–3 are report-derived. The eight regression fixtures are in `js/digital-readout/model.js`.

**Data model:** the example 4×4 matrix is taken from §5.5. Other exposures use a deliberately simplified reference scaling by `tEXP/64`, rounded and clipped to eight bits. `P_CDS = P_reset − P_signal` is digital subtraction only; the UI does not model analog CDS noise attenuation. The 4-columns × cycles-per-sample throughput budget is an illustrative lower bound, not a proven RTL assertion. The scheduler constraint `exposure_rows ≤ vertical_blank_rows` is reported in §5.4.

**Imported RTL data:** On the waveform page, import a JSON file shaped as:

```json
{
  "meta": {"source": "GHDL/cocotb VCD-derived RTL trace"},
  "samples": [
    {"cycle":0,"clk":0,"frame_active":1,"rst":0,"tg":0,"sel":0,"pixel_valid":0,"column_index":null,"pixel_data":null},
    {"cycle":1,"clk":1,"frame_active":1,"rst":0,"tg":0,"sel":0,"pixel_valid":0,"column_index":null,"pixel_data":null}
  ]
}
```

Use one row's selected control signals, as indicated by the waveform's `Row` selector. Import is display-only; the webpage does not invoke GHDL or cocotb. To export actual traces, obtain cycle-indexed signals from the original simulation and convert them to this schema.

**Tests:** `npm test` now runs both the original physical-model tests and `tests/digital-readout.test.mjs` (eight report timing fixtures, default exposure event markers, default reconstructed image, digital subtraction and monitor fault detection).

### Integrating into an existing Git checkout

Do not copy `.git` from another directory. Extract this archive and copy its contents **over** the working tree you already cloned, preserving the existing `.git` directory. A safe command from the parent directory is:

```bash
rsync -av --exclude='.git' ./cmos-sensor-lab/ /path/to/your/existing/cmos-sensor-lab/
cd /path/to/your/existing/cmos-sensor-lab
npm test
git add -A && git commit -m "Add interactive digital readout project lab" && git push
```

Run `python3 -m http.server 8000` from the repository root, then open `/pages/digital-readout.html`. This static site remains compatible with GitHub Pages.
