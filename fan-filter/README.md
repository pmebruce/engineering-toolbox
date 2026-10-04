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

## FloTHERM Advanced resistance (v1.2)

Fits input filter points to deltaP = c1*v + c2*v^2 with c1,c2 >= 0, zero intercept and approach velocity v=Q/frontal area. Independent of the chart interpolation mode, extra system resistance and dirty multiplier. At least two distinct positive velocities required.

Uses Index=0, Re=rho*v*L/mu. Planar/Collapsed: A=2*L*c1/mu, B=2*c2/rho (dimensionless). Volume/Non-Collapsed: divide both by the modeled flow-direction thickness d in metres (units 1/m). L is the Reynolds reference length, distinct from d. Air properties should match curve measurement conditions.

TXT and clipboard exports include all settings, fit range, units and RMSE. This is for manual setup in FloTHERM; no proprietary automatic import is claimed. Verify pressure drop in the model and use the measured speed range.

Primary reference: Flomerics Ltd, Compact Models / Advanced Resistances, slides 18–22: https://www.resheji.com/d/uploads/Flotherm/AdvancedTraining_11_Compact_Models.pdf
