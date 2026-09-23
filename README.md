# Dungeon Quest slider test

Version 2 adds independent Width (1, 1.25, 1.6, 2) and Depth (1, 0.75, 0.5) comparison controls. Both default to the original shape. Leave Room scale at 1 to preserve height. Changes apply in first-camera coordinates to the model and camera positions, while camera/headset rotations remain rigid. Spark's covariance mode (extended splats and extended accumulator) transforms Gaussian shapes correctly under nonuniform scaling. These are visual calibration experiments, not a recovered ground-truth geometry correction. Headset performance of covariance mode still needs validation.

Separate WebXR viewer for the 209,649-splat, 60-frame slider reconstruction. Open index.html through HTTPS (GitHub Pages) or a localhost web server; file:// is not supported.

Load room, then Enter VR on Meta Quest Browser. Left thumbstick slides through recorded camera positions. Right thumbstick up/down adjusts vertical position by at most 6 cm at the default approximate scale. A/X resets to the initial viewpoint and re-centers on the current headset position and heading. No automatic motion in VR. Physical head tracking remains active. This is a limited frontal capture, not a reconstructed 360-degree room.

The model is split into three binary pieces only for browser-based GitHub upload. The viewer verifies SHA-256 for each piece and reconstructs the exact PLY bytes before decoding. Full source spherical-harmonic data is retained in the files. Nothing from the old GLB or existing Pages viewer is modified.

Camera transforms are derived from processed-slider60-clean/transforms.json and this run's dataparser_transforms.json. The dataset's applied_transform is removed from the saved parser transform before applying it to saved frame poses, preventing a duplicate axis conversion. Both mesh and cameras receive the same rigid transform and uniform scale. Desktop projection uses recovered intrinsics; immersive stereo uses headset projections. Calibration is not physically validated; headset views can differ from desktop renders. Default metric scale assumes the full reconstructed travel is 0.6 m, based on the requested WAN motion, not a measured distance. The scale selector supports adjustment.

Dependencies: Three.js 0.180.0 (MIT), Spark 2.2.0 (MIT), vendored locally. Model content belongs to the repository owner; no redistribution license for that content is implied.

Desktop validation completed: all 209,649 splats load with per-chunk SHA-256 verification; start and midpoint views render; path playback, scale selection, and reset work. JavaScript syntax check passed with no runtime errors in the browser. Actual Quest stereo, controller mappings, comfort and frame rate require headset validation.
