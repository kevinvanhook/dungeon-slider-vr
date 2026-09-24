# Woman Orbit Quest viewer

WebXR viewer for the 30,000-iteration, 217,770-Gaussian reconstruction built from the 77 curated woman-orbit frames (009–085).

The calibrated defaults are width 1.5×, forward depth 0.5×, and unchanged height. The controls retain alternate values for comparison. Nonuniform scaling is applied in first-camera coordinates to both the Gaussian model and recovered camera positions; camera and headset rotations remain rigid.

Open through HTTPS in Meta Quest Browser. Select **Load scene**, face forward, and select **Enter VR**. The left thumbstick travels along the recovered camera orbit, the right thumbstick adjusts height slightly, and A/X resets and recenters.

The PLY is split into three binary chunks for browser hosting. `scene.json` contains byte counts and SHA-256 hashes so the viewer can verify and reconstruct the exact exported PLY before decoding. The recovered intrinsics and 77 camera transforms come from the 30k Nerfstudio run.

Dependencies are vendored locally: Three.js 0.180.0 and Spark 2.2.0, both MIT licensed.
