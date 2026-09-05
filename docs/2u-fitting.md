# Fit four devices into 2U

Open the configurator and load `public/examples/four-devices-2u.json`, or load your original four-device share link and choose **Fit to 2U** in the properties panel. On mobile, open the **Properties** tab first.

The proposal previews the arrangement and lists rotations, mount changes and any split movement. **Apply 2U layout** installs it; **Undo fitted layout** restores the previous configuration until another edit is made. Every device stays on its original side. A locked split stays fixed. Grid snapping does not round the proposed positions.

## Saved arrangement

The panel is 440.5 × 88.9 mm, split 20 mm right of center. Standard wall setting (`heavyDevice: 0`) and 1 mm device clearance are retained.

| Device | Front W × H × D (mm) | X (mm) | Y (mm) | Mount |
| --- | --- | --- | --- | --- |
| UCG-Fiber | 213 × 30 × 128 | -102.775 | -22.5 | Compact; shared divider |
| Comet X | 170 × 40 × 90 | -102.775 | 17.5 | Compact; shared divider |
| Minisforum AI X1 | 127.5 × 58 × 125.5 | 99.275 | 0 | Standard cage |
| Pi 5 + Waveshare PoE NVME HAT | 30 × 66 × 97 | 195.025 | 0 | Standard cage, on its side |

The left support stack is 84 mm tall, leaving 2.45 mm at each panel edge. The right envelopes are 74 and 82 mm tall. The seam reserve reflects the M3 joiner wall plus a 2 mm assembly buffer. Device dimensions are the application's catalog measurements; verify the assembled hardware including protrusions.

All four holders in the saved arrangement have no rear plate (`backStyle: "none"` on each device), including the Comet X. The Comet remains in its compact shared support, but its device opening now continues through the rear. Geometry validation checks the exit as well as the insertion space.

## Manual editing

Select a device and use **Orientation → On its side (90°)**. Generic cages and cutouts support rotation; specialty mounts with fixed holes or port features require a separate design. Width and height swap while depth remains unchanged. The opening and generic cage are regenerated for this orientation.

To share a divider, use **Stack above with a shared divider** and select another device on the same side. Both become compact cages and align exactly. Shared assemblies move together when dragged or when X/Y is edited. **Detach from shared support** permits independent placement. A disconnected or overlapping assembly receives fit feedback.

The compact cage uses 4 mm walls at the standard setting, 5/6 mm at heavier settings. Its side, top/bottom and ventilated rear walls use honeycomb through-holes like the standard cages, with the same hex diameter and web thickness settings. It retains front/rear rails and selectable rear closure. The honeycomb grid aligns between different-width sleeves sharing a divider. It avoids the standard cage's 8 mm reinforcing border. Adjacent sleeves overlap by exactly one wall thickness, producing a single divider in the exported union.

Honeycomb replaces the compact holder's long rectangular openings, reducing long bridges. It does not certify a support-free print: inspect the chosen orientation, hooks, rear closures and bridging in your slicer.

## Fit checking and scope

The editor uses the same resolved dimensions as the SCAD generator. It reports panel overflow, joiner conflicts, mount collisions and unsupported orientations. Generic cage and compact envelopes are measured from their actual geometry. Specialty mount outlines are approximate and explicitly marked for manual checking.

Automatic fitting searches orientations and horizontal/vertical arrangements for up to six devices per side (or six on a single panel), optionally including compact cages and shared dividers. It preserves sides, backs, dimensions and all device identities. The bounded search can miss a possible arrangement; failure says that no arrangement was found, not that one is mathematically impossible. It never raises the requested 2U height or deletes a device.

Geometry checks do not establish load capacity, cooling, cable access, insertion retention or printer bed compatibility. Confirm these on the hardware and with a physical test print. Two printable STL halves are supplied separately; the assembled STL is for inspection.

## Reproduce validation and exports

- `npm test`: dimensional, fitting, persistence and export regression tests.
- `npm run lint` and `npm run build`: source checks and production build.
- `npm run test:geometry`: rebuild the shipped SCAD library, generate the saved example, and render the two halves plus a standalone bundled SCAD model with the shipped OpenSCAD WASM engine. It checks connected meshes, 2U height, warnings and all four insertion volumes. Outputs and a validation report go to `artifacts/rack-2u/`.

`npm run dev` and `npm run build` rebuild `public/rack-scad.zip` from the source modules, preventing stale geometry in the browser. JSON and share links preserve orientations and shared group membership. SCAD exports carry resolved dimensions directly, avoiding drift between the web and OpenSCAD device catalogs.

To export an existing 2U configuration without refitting or changing its joiner settings, run `node scripts/build-scad-library.mjs` followed by `node scripts/export-2u-example.mjs /path/to/rack_config.json artifacts/custom-rack`. The default example is not overwritten when an input file is supplied.
