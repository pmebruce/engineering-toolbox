# 風扇／濾網阻抗曲線整理器

Static, local-only PWA for fan PQ and filter/system pressure data. No backend, analytics, or data upload. User inputs are kept in localStorage on the device.

- Paste/import two-column CSV, TSV or space-delimited data (flow, pressure).
- Independent flow and pressure units; filter face velocity converted with effective frontal area.
- Original piecewise linear interpolation without extrapolation, or optional origin-constrained least-squares quadratic resistance fit with RMSE.
- All intersection points are computed analytically per piecewise segment. Multiple roots, coincident segments and positive fan slopes are reported. Local slope labels are not a stall or dynamic stability guarantee.
- Ideal identical fan series/parallel composition and speed scaling at constant density.
- Optional additional quadratic system resistance and user-defined filter pressure multiplier scenario.
- CSV fan/system/comparison tables and standalone SVG chart exports. CSV is a generic numeric table, not a proprietary FloTHERM import format.
- Example data is synthetic and explicitly labeled. Changes are local; exported data is downloaded to the user's device.

Run numerical checks: `node calc.test.mjs`.

Assumptions: consistent pressure definitions and air conditions, no mounting/system-effect correction. Filter multiplier is a hypothetical pressure ratio, not a dust loading prediction. No extrapolation in measured interpolation mode; quadratic extrapolation is explicitly marked. Zero-flow data is not invented.
