# Vendored files

## `so101_new_calib.urdf`

- **Source:** [TheRobotStudio/SO-ARM100](https://github.com/TheRobotStudio/SO-ARM100), `Simulation/SO101/so101_new_calib.urdf`
- **Pinned at commit:** `385e8d7` (2025-07-02), copied unmodified on 2026-10-05
- **Licence:** Apache-2.0, © TheRobotStudio and contributors. The full licence text is at <https://www.apache.org/licenses/LICENSE-2.0>.

The page does not load this file. `arm3d.js` embeds the joint origins, axes and limits from it as a constants table, and `test.mjs` parses this copy to prove the table matches the file number for number. It is here so that "exact to the URDF" is something anyone can check.

## `reference_fk.py`

Not vendored: written for this repo (MIT, like the rest of it). An independent forward-kinematics implementation that reads the URDF above with an XML parser and multiplies 4×4 matrices. `test.mjs` checks `arm3d.js` against the poses it prints.

The SO-100 file in the same repository (`Simulation/SO100/so100.urdf` @ `0c8e289`) gives the same two link lengths, 116.00 mm and 135.00 mm. The SO-101 file is used because it is the maintained one and defines a fingertip frame.

## `three.min.js`

- **Source:** [three.js](https://github.com/mrdoob/three.js) r149, the `build/three.min.js` file of the npm package `three@0.149.0`, copied unmodified on 2026-10-10 (sha256 begins `8a5f7249903b54d3`).
- **Licence:** MIT, © 2010-2023 three.js authors.

Used only by `workbench.html`, which loads it with a plain script tag so the page still opens from a downloaded copy. r149 is the last release that ships this single-file build without a deprecation warning.
