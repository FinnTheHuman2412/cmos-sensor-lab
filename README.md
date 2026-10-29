# CMOS Dynamic Range Lab

A standalone educational SNR explorer. No npm, external libraries, or internet connection required.

## Run

From this folder:

```bash
python3 -m http.server 8000
```

Open http://localhost:8000 in your browser.

The local server allows JavaScript to load `config.json`. If `index.html` is opened directly, the page still works with built-in default parameters but won't load JSON defaults.

## Edit

- `index.html` — interface
- `styles.css` — responsive styling
- `app.js` — controls, sensor noise equations, chart, and CSV export
- `config.json` — starting sensor parameters and model assumptions

## Model

For a signal of `n` electrons, each readout path has:

- ADC saturation: `min(FWC, Vadc / (CG * analog_gain))`
- Quantization noise (electrons RMS): `Vadc / (2^bits * sqrt(12) * CG * analog_gain)`
- Total input-referred noise (electrons RMS): `sqrt(n + read_noise^2 + quant_noise^2 + (n * PRNU)^2)`
- SNR: `20 * log10(n / total_noise)`

Conversion gain in those equations is in V/electron. Analog gain is dimensionless. Read noise is treated as an input-referred common constant across both paths. The model assumes uniformly distributed quantization error and independent noise terms. The HCG→LCG combination uses the HCG branch until it clips, then switches to LCG if available.

This is a *simplified educational model*, not a complete physical HDR sensor prediction. In particular, 'combined DR' uses the maximum saturation charge divided by the smaller of the two dark-noise RMS values, which is an optimistic envelope metric and not a rigorously calibrated end-to-end dynamic-range measurement.
