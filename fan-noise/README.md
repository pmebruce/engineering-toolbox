# Fan noise and airflow comparison v1.0

Local-only static PWA. Compare up to six identical-fan parallel-array scenarios. Energy addition of uncorrelated sources; sound pressure values must describe contribution at the same receiving position. Same-distance mode rejects mismatched distances. Optional free-field far-field propagation uses -20 log10(r2/r1). No room/near-field/cabinet acoustics model.

LpA and LwA remain separate. Sound power is not judged against a sound pressure limit; changing basis clears acoustic values. RPM is recorded and never used to infer absolute noise. Airflow target is evaluated from input operating-point airflow, not free-air flow. Optional import reads saved fan/filter data in localStorage on the same origin; only unique parallel-array operating points accepted. No input data is uploaded.

Synthetic example: one fan 32 dBA, two fans each 25 dBA, four fans each 22 dBA; total flows 110/110/112 CFM, same 1 m conditions. Not vendor specifications.

Validate: node calc.test.mjs

Sources: ebm-papst Catalog_Axialfans_ESM-iQ_EN.pdf (energy addition and distance laws); Greenheck FA/121 (sound pressure versus sound power).
