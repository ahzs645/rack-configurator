/*
 * CageMaker PRCG - Rack Ears Module
 * Modular Component: L-shaped rack mounting ears/brackets
 *
 * Based on Fusion2SCAD export, converted to standard OpenSCAD
 * License: CC BY-NC-SA 4.0
 */

use <utilities.scad>

// Default dimensions (from original Fusion 360 export)
_EAR_THICKNESS = 2.9;
_EAR_SIDE_WIDTH = 75;
_EAR_SIDE_HEIGHT = 25;
_EAR_BOTTOM_DEPTH = 22;
_EAR_HOLE_RADIUS = 2.25;
_EAR_COUNTERSINK_RADIUS = 4;
_EAR_ROUNDING = 0.3;

// Toolless hook dimensions (derived from backplate_profile polygon)
// Profile Y range: 2.25 to 32.65 = 30.4mm total height
HOOK_HEIGHT = 30.4;
HOOK_MIN_Y = 2.25;
HOOK_MAX_Y = 32.65;

// Toolless hook pattern spacing (standard rack hole spacing)
// 4.7625cm = 47.625mm = 1.875" = 3/16 of 10"
HOOK_SPACING = 47.625;

/*
 * Create a rounded cube (simplified version without BOSL2)
 *
 * Parameters:
 *   size - [x, y, z] dimensions
 *   rounding - corner radius
 *   center - center the cube
 */
module rounded_cube(size, rounding=0.3, center=false)
{
    if (rounding > 0)
    {
        translate(center ? [0, 0, 0] : [size[0]/2, size[1]/2, size[2]/2])
            minkowski()
            {
                cube([size[0] - rounding*2, size[1] - rounding*2, size[2] - rounding*2], center=true);
                sphere(r=rounding, $fn=16);
            }
    }
    else
    {
        cube(size, center=center);
    }
}

/*
 * Create a countersink hole
 *
 * Parameters:
 *   hole_radius - radius of the through hole
 *   countersink_radius - radius at the top of countersink
 *   depth - total depth of hole
 *   countersink_depth - depth of the countersink cone
 */
module countersink_hole(hole_radius=2.25, countersink_radius=4, depth=7, countersink_depth=2.75, fn=32)
{
    union()
    {
        // Main hole
        translate([0, 0, -1])
            cylinder(h=depth, r=hole_radius, $fn=fn);

        // Countersink cone
        translate([0, 0, -countersink_depth])
            cylinder(h=countersink_depth, r1=countersink_radius, r2=hole_radius, $fn=fn);
    }
}

/*
 * Create the backplate polygon profile
 * This is the EIA rack mounting bracket shape
 *
 * Parameters:
 *   scale_factor - scale the profile (default 1.0)
 */
module backplate_profile(scale_factor=1.0)
{
    scale([scale_factor, scale_factor])
        polygon([
            [-8.1, 12.55],
            [-4.7, 12.55],
            [-4.7, 2.25],
            [0, 2.25],
            [0, 32.65],
            [-12.1, 32.65],
            [-12.1, 22.65],
            [-8.1, 22.65],
            [-8.1, 28.15],
            [-4.7, 28.15],
            [-4.7, 17.05],
            [-12.1, 17.05],
            [-12.1, 7.05],
            [-8.1, 7.05]
        ]);
}

/*
 * Create a toolless rack hook (just the hook profile, no screws)
 * For use with toolless racks like Ubiquiti
 *
 * Parameters:
 *   thickness - material thickness
 *   fn - detail level
 */
module rack_hook(thickness = 2.9, fn = 32)
{
    rotate([90, 0, 90])
        linear_extrude(thickness)
            backplate_profile();
}

/*
 * Create a single rack ear (left side)
 *
 * Parameters:
 *   thickness - material thickness
 *   side_width - width of the side panel
 *   side_height - height of the side panel
 *   bottom_depth - depth of the bottom panel
 *   hole_radius - mounting hole radius
 *   countersink - use countersink holes
 *   toolless - if true, omit screw holes for toolless rack mounting
 *   rounding - edge rounding radius
 *   fn - detail level
 */
module rack_ear_left(
    thickness = 2.9,
    side_width = 75,
    side_height = 25,
    bottom_depth = 22,
    hole_radius = 2.25,
    countersink = true,
    toolless = false,
    rounding = 0.3,
    fn = 32
)
{
    difference()
    {
        union()
        {
            // Side panel (vertical, along XZ plane)
            translate([side_width/2, 0, side_height/2])
                cube([side_width, thickness, side_height], center=true);

            // Bottom panel (horizontal, along XY plane)
            translate([side_width/2, bottom_depth/2 + thickness/2, thickness/2])
                cube([side_width, bottom_depth, thickness], center=true);

            // Backplate (EIA mounting bracket / hooks)
            translate([0, 0, 0])
                rack_hook(thickness, fn);

            // Support block
            translate([side_width - 5, bottom_depth/2 + thickness, 0])
                cube([5, 5, 1.5]);
        }

        // Mounting hole with optional countersink (skip if toolless)
        if (!toolless)
        {
            if (countersink)
            {
                translate([side_width/2 - 3.8, -1, side_height/2])
                    rotate([-90, 0, 0])
                        countersink_hole(hole_radius, 4, thickness + 2, 1.75, fn);
            }
            else
            {
                translate([side_width/2 - 3.8, -1, side_height/2])
                    rotate([-90, 0, 0])
                        cylinder(h=thickness + 2, r=hole_radius, $fn=fn);
            }
        }
    }
}

/*
 * Create a single rack ear (right side - mirrored)
 *
 * Parameters:
 *   (same as rack_ear_left)
 */
module rack_ear_right(
    thickness = 2.9,
    side_width = 75,
    side_height = 25,
    bottom_depth = 22,
    hole_radius = 2.25,
    countersink = true,
    toolless = false,
    rounding = 0.3,
    fn = 32
)
{
    mirror([1, 0, 0])
        rack_ear_left(thickness, side_width, side_height, bottom_depth,
                      hole_radius, countersink, toolless, rounding, fn);
}

/*
 * Create a pair of rack ears positioned for a faceplate
 *
 * Parameters:
 *   faceplate_width - width of the faceplate in mm
 *   faceplate_height - height of the faceplate in mm (U * 44.45)
 *   ear_thickness - material thickness
 *   ear_depth - how far the ears extend back
 *   hole_radius - mounting hole radius
 *   countersink - use countersink holes
 *   toolless - if true, omit screw holes for toolless rack mounting
 *   fn - detail level
 */
module rack_ears_pair(
    faceplate_width = 254,
    faceplate_height = 44.45,
    ear_thickness = 2.9,
    ear_depth = 22,
    hole_radius = 2.25,
    countersink = true,
    toolless = false,
    fn = 32
)
{
    ear_width = 40;  // Standard ear width

    // Left ear - hooks pointing outward (to the left, -X direction)
    translate([-faceplate_width/2, -faceplate_height/2, 0])
        rotate([0, 90, 0])
            rotate([90, 0, 0])
                mirror([1, 0, 0])
                    rack_ear_left(
                        thickness = ear_thickness,
                        side_width = faceplate_height,
                        side_height = ear_width,
                        bottom_depth = ear_depth,
                        hole_radius = hole_radius,
                        countersink = countersink,
                        toolless = toolless,
                        fn = fn
                    );

    // Right ear - hooks pointing outward (to the right, +X direction)
    translate([faceplate_width/2, -faceplate_height/2, 0])
        rotate([0, -90, 0])
            rotate([90, 0, 0])
                rack_ear_left(
                    thickness = ear_thickness,
                    side_width = faceplate_height,
                    side_height = ear_width,
                    bottom_depth = ear_depth,
                    hole_radius = hole_radius,
                    countersink = countersink,
                    toolless = toolless,
                    fn = fn
                );
}

/*
 * Create rack ears sized for standard rack units
 *
 * Parameters:
 *   rack_width - rack width in inches (10, 19, etc.)
 *   unit_height - height in U (1, 2, 3, etc.)
 *   ear_depth - how far the ears extend back
 *   ear_thickness - material thickness
 *   hole_radius - mounting hole radius
 *   countersink - use countersink holes
 *   toolless - if true, omit screw holes for toolless rack mounting (e.g., Ubiquiti)
 *   fn - detail level
 */
module rack_ears_for_rack(
    rack_width = 10,
    unit_height = 1,
    ear_depth = 22,
    ear_thickness = 2.9,
    hole_radius = 2.25,
    countersink = true,
    toolless = false,
    fn = 32
)
{
    _INCH_MM = 25.4;
    _EIA_UNIT = 44.45;

    faceplate_width = rack_width * _INCH_MM;
    faceplate_height = unit_height * _EIA_UNIT;

    rack_ears_pair(
        faceplate_width = faceplate_width,
        faceplate_height = faceplate_height,
        ear_thickness = ear_thickness,
        ear_depth = ear_depth,
        hole_radius = hole_radius,
        countersink = countersink,
        toolless = toolless,
        fn = fn
    );
}

/*
 * Create a simple L-bracket rack ear (alternative simpler design)
 *
 * Parameters:
 *   width - ear width
 *   height - ear height (vertical part)
 *   depth - ear depth (horizontal part)
 *   thickness - material thickness
 *   hole_diameter - mounting hole diameter
 *   hole_offset - offset from center for hole
 *   fn - detail level
 */
module simple_rack_ear(
    width = 40,
    height = 44.45,
    depth = 20,
    thickness = 3,
    hole_diameter = 5,
    hole_offset = 0,
    fn = 32
)
{
    difference()
    {
        union()
        {
            // Vertical part
            cube([width, thickness, height]);

            // Horizontal part
            cube([width, depth, thickness]);
        }

        // Mounting hole
        translate([width/2, -1, height/2 + hole_offset])
            rotate([-90, 0, 0])
                cylinder(h=thickness + 2, d=hole_diameter, $fn=fn);
    }
}

/*
 * Create a pair of simple L-bracket rack ears
 *
 * Parameters:
 *   faceplate_width - width of the faceplate
 *   unit_height - height in rack units
 *   ear_width - width of each ear
 *   ear_depth - depth of horizontal part
 *   thickness - material thickness
 *   hole_diameter - mounting hole diameter
 *   fn - detail level
 */
module simple_rack_ears_pair(
    faceplate_width = 254,
    unit_height = 1,
    ear_width = 30,
    ear_depth = 20,
    thickness = 3,
    hole_diameter = 5,
    fn = 32
)
{
    _EIA_UNIT = 44.45;
    height = unit_height * _EIA_UNIT;

    // Left ear
    translate([-faceplate_width/2 - thickness, -height/2, 0])
        mirror([1, 0, 0])
            simple_rack_ear(ear_width, height, ear_depth, thickness, hole_diameter, 0, fn);

    // Right ear
    translate([faceplate_width/2, -height/2, 0])
        simple_rack_ear(ear_width, height, ear_depth, thickness, hole_diameter, 0, fn);
}

/*
 * Create rack hooks at the bottom of a faceplate (hooks only, no L-bracket)
 * For toolless mounting to Ubiquiti-style racks
 *
 * Parameters:
 *   rack_width - rack width in inches (10, 19, etc.)
 *   unit_height - height in U (1, 2, 3, etc.)
 *   thickness - material thickness of hooks
 *   fn - detail level
 */
module bottom_rack_hooks(
    rack_width = 10,
    unit_height = 1,
    thickness = 2.9,
    fn = 32
)
{
    _INCH_MM = 25.4;
    _EIA_UNIT = 44.45;

    faceplate_width = rack_width * _INCH_MM;
    faceplate_height = unit_height * _EIA_UNIT;

    // Left hook - mirrored version of right hook
    mirror([1, 0, 0])
        translate([faceplate_width/2 - thickness, -faceplate_height/2, 0])
            rotate([0, 90, 90])
                rack_hook(thickness, fn);

    // Right hook - pointing outward, laying toward +Y
    translate([faceplate_width/2 - thickness, -faceplate_height/2, 0])
        rotate([0, 90, 90])
            rack_hook(thickness, fn);
}

/*
 * Create a positioned toolless rack hook
 * Allows vertical positioning relative to rack height
 *
 * Parameters:
 *   thickness - material thickness
 *   rack_height - total height of the faceplate (in mm)
 *   position - "bottom", "top", or "center"
 *   side - "left" or "right"
 *   fn - detail level
 *
 * The hook is positioned in XZ plane:
 *   - X: At 0 for left side, extends in -X; at 0 for right side, extends in +X
 *   - Z: Positioned based on position parameter
 */
module positioned_rack_hook(
    thickness = 2.9,
    rack_height = 88.9,
    position = "bottom",
    side = "left",
    fn = 32
)
{
    // Calculate Z offset based on position
    z_offset = (position == "top") ? rack_height - HOOK_HEIGHT :
               (position == "center") ? (rack_height - HOOK_HEIGHT) / 2 : 0;

    if (side == "left") {
        translate([0, 0, z_offset])
        rotate([90, 0, 0])
        mirror([1, 0, 0])
        rotate([0, 90, 90])
        rack_hook(thickness, fn);
    } else {
        translate([0, 0, z_offset])
        rotate([90, 0, 0])
        rotate([0, 90, 90])
        rack_hook(thickness, fn);
    }
}

/*
 * Create a pair of positioned toolless rack hooks
 *
 * Parameters:
 *   thickness - material thickness
 *   rack_height - total height of the faceplate (in mm)
 *   panel_width - width between the hooks (for right side positioning)
 *   position - "bottom", "top", or "center"
 *   fn - detail level
 */
module positioned_rack_hooks_pair(
    thickness = 2.9,
    rack_height = 88.9,
    panel_width = 450.85,
    position = "bottom",
    fn = 32
)
{
    // Left hook at X=0
    positioned_rack_hook(thickness, rack_height, position, "left", fn);

    // Right hook at X=panel_width
    translate([panel_width, 0, 0])
    positioned_rack_hook(thickness, rack_height, position, "right", fn);
}

/*
 * Create a toolless rack hook at a specific Z offset
 *
 * Parameters:
 *   thickness - material thickness
 *   z_offset - Z position from bottom of faceplate
 *   side - "left" or "right"
 *   fn - detail level
 */
module rack_hook_at_offset(
    thickness = 2.9,
    z_offset = 0,
    side = "left",
    fn = 32
)
{
    if (side == "left") {
        translate([0, 0, z_offset])
        rotate([90, 0, 0])
        mirror([1, 0, 0])
        rotate([0, 90, 90])
        rack_hook(thickness, fn);
    } else {
        translate([0, 0, z_offset])
        rotate([90, 0, 0])
        rotate([0, 90, 90])
        rack_hook(thickness, fn);
    }
}

/*
 * Create multiple toolless rack hooks based on a pattern
 * Hooks are positioned at regular intervals (HOOK_SPACING) from the bottom
 *
 * Parameters:
 *   thickness - material thickness
 *   rack_height - total height of the faceplate (in mm)
 *   hook_pattern - array of booleans indicating which hooks are enabled
 *                  e.g., [true, false, true] = hooks at positions 0 and 2
 *   side - "left" or "right"
 *   fn - detail level
 */
module patterned_rack_hooks(
    thickness = 2.9,
    rack_height = 88.9,
    hook_pattern = [true],
    side = "left",
    fn = 32
)
{
    // Calculate how many hook positions fit
    max_hooks = floor((rack_height - HOOK_HEIGHT) / HOOK_SPACING) + 1;

    for (i = [0 : min(len(hook_pattern), max_hooks) - 1]) {
        if (hook_pattern[i]) {
            z_offset = i * HOOK_SPACING;
            rack_hook_at_offset(thickness, z_offset, side, fn);
        }
    }
}

/*
 * Create a pair of patterned toolless rack hooks
 *
 * Parameters:
 *   thickness - material thickness
 *   rack_height - total height of the faceplate (in mm)
 *   panel_width - width between the hooks (for right side positioning)
 *   hook_pattern - array of booleans indicating which hooks are enabled
 *   fn - detail level
 */
module patterned_rack_hooks_pair(
    thickness = 2.9,
    rack_height = 88.9,
    panel_width = 450.85,
    hook_pattern = [true],
    fn = 32
)
{
    // Left hooks at X=0
    patterned_rack_hooks(thickness, rack_height, hook_pattern, "left", fn);

    // Right hooks at X=panel_width
    translate([panel_width, 0, 0])
    patterned_rack_hooks(thickness, rack_height, hook_pattern, "right", fn);
}
