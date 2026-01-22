/*
 * CageMaker PRCG - Ruler and Guide Module
 * Modular Component: Preview rulers, markers, and build volume guides
 *
 * Based on CageMaker PRCG v0.21 by WebMaka
 * Original: https://github.com/WebMaka/CageMakerPRCG
 * License: CC BY-NC-SA 4.0
 */

use <utilities.scad>

// EIA unit height constant
_EIA_UNIT = 44.45;
_INCH_MM = 25.4;

/*
 * Create a horizontal ruler with tick marks at 5mm, 10mm, and 25mm intervals
 * Only visible in preview mode, not in final render
 *
 * Parameters:
 *   rack_width - Rack width in inches
 *   units_required - Height in rack units
 *   heavy_device - Thickness setting (0, 1, or 2)
 */
module horizontal_ruler(rack_width, units_required, heavy_device=0)
{
    plate_width = rack_width * _INCH_MM;
    half_width = ceil((plate_width / 2) / 5) * 5;

    for (i = [-half_width : 5 : half_width])
    {
        translate([i, 0, 3.75 + heavy_device])
        {
            // 5mm tick marks (small)
            if (i % 5 == 0)
                color("maroon")
                    cube([1, units_required * _EIA_UNIT + 3, 1], center=true);

            // 10mm tick marks (medium)
            if (i % 10 == 0)
                color("red")
                    cube([1, units_required * _EIA_UNIT + 10, 1.5], center=true);

            // 25mm tick marks with labels
            if (i % 25 == 0)
            {
                // Top label
                translate([i / (plate_width / 2), units_required * _EIA_UNIT / 2 + 9, heavy_device])
                    color("red")
                        linear_extrude(height=1, center=true)
                            text(str(i), halign="center", valign="center", size=5);

                // Bottom label
                translate([i / (plate_width / 2), -units_required * _EIA_UNIT / 2 - 9, heavy_device])
                    color("red")
                        linear_extrude(height=1, center=true)
                            text(str(i), halign="center", valign="center", size=5);

                // Label backgrounds
                translate([i / (plate_width / 2), units_required * _EIA_UNIT / 2 + 9, -1 + heavy_device])
                    color("white")
                        four_rounded_corner_plate(10, 16, 1, 2.5);

                translate([i / (plate_width / 2), -units_required * _EIA_UNIT / 2 - 9, -1 + heavy_device])
                    color("white")
                        four_rounded_corner_plate(10, 16, 1, 2.5);
            }
        }
    }
}

/*
 * Create a height marker showing print height
 *
 * Parameters:
 *   rack_width - Rack width in inches
 *   total_depth - Total depth of cage
 *   heavy_device - Thickness setting
 */
module height_marker(rack_width, total_depth, heavy_device=0)
{
    plate_width = rack_width * _INCH_MM;
    half_width = ceil((plate_width / 2) / 5) * 5;
    print_height = total_depth + 12 + heavy_device;

    // Horizontal line at print height
    translate([0, 0, print_height])
        color("blue")
            cube([half_width * 2, 1, 1], center=true);

    // Height value label
    translate([half_width + 2, 4, print_height])
        color("blue")
            linear_extrude(height=1, center=true)
                text(str(print_height, "mm"), halign="left", valign="center", size=5);

    // "PRINT HEIGHT" label
    translate([half_width + 2, -4, print_height])
        color("blue")
            linear_extrude(height=1, center=true)
                text("PRINT HEIGHT", halign="left", valign="center", size=5);

    // Label background
    translate([half_width + 26, 0, print_height - 1])
        color("white")
            four_rounded_corner_plate(18, 56, 1, 5);
}

/*
 * Create a cage center marker
 *
 * Parameters:
 *   offset_x - Horizontal offset of cage center
 *   units_required - Height in rack units
 *   cage_depth - Depth of the cage
 */
module cage_center_marker(offset_x, units_required, cage_depth)
{
    marker_height = cage_depth + 20;

    // Vertical line through cage center
    translate([offset_x, 0, marker_height / 2 - 5])
        color("blue")
            cube([0.5, units_required * _EIA_UNIT + 10, marker_height + 10], center=true);

    // Offset value label
    translate([offset_x, -units_required * _EIA_UNIT / 2 - 13, 20])
        color("blue")
            linear_extrude(height=1, center=true)
                text(str(offset_x), halign="center", valign="center", size=5);

    // "CAGE CENTER" label
    translate([offset_x, -units_required * _EIA_UNIT / 2 - 20, 20])
        color("blue")
            linear_extrude(height=1, center=true)
                text("CAGE CENTER", halign="center", valign="center", size=5);

    // Label background
    translate([offset_x, -units_required * _EIA_UNIT / 2 - 17, 19])
        color("white")
            four_rounded_corner_plate(18, 54, 1, 5);
}

/*
 * Create a modification offset marker
 *
 * Parameters:
 *   offset_x - Horizontal offset of modification
 *   units_required - Height in rack units
 *   mod_height - Height of the modification
 */
module mod_offset_marker(offset_x, units_required, mod_height)
{
    marker_height = mod_height + 20;

    // Vertical line through mod center
    translate([offset_x, 0, marker_height / 2 - 5])
        color("green")
            cube([0.5, units_required * _EIA_UNIT + 10, marker_height + 10], center=true);

    // Offset value label
    translate([offset_x, -units_required * _EIA_UNIT / 2 - 13, 20])
        scale([0.5, 0.5, 1.0])
            color("green")
                linear_extrude(height=1, center=true)
                    text(str(offset_x), halign="center");

    // "MOD CENTER" label
    translate([offset_x, -units_required * _EIA_UNIT / 2 - 20, 20])
        scale([0.5, 0.5, 1.0])
            color("green")
                linear_extrude(height=1, center=true)
                    text("MOD CENTER", halign="center");

    // Label background
    translate([offset_x, -units_required * _EIA_UNIT / 2 - 14, 19])
        color("white")
            four_rounded_corner_plate(16, 50, 1, 5);
}

/*
 * Create a 3D printer build volume outline
 *
 * Parameters:
 *   build_size - Build volume dimension in mm (assumes cubic)
 */
module build_volume_outline(build_size)
{
    if (build_size > 0)
    {
        color("maroon")
            difference()
            {
                // Outer cube
                translate([0, 0, build_size / 2 + 0.01])
                    cube([build_size, build_size, build_size], center=true);

                // Carve out interior leaving just edges
                translate([5, 0, build_size / 2])
                    cube([build_size * 1.1, build_size - 1, build_size - 1], center=true);
                translate([0, 5, build_size / 2])
                    cube([build_size - 1, build_size * 1.1, build_size - 1], center=true);
                translate([0, 0, build_size / 2])
                    cube([build_size - 1, build_size - 1, build_size * 1.1], center=true);
            }

        // Size label
        translate([0, -build_size / 2 - 10, 1])
            color("blue")
                linear_extrude(height=1, center=true)
                    text(str(build_size, "mm BUILD VOLUME"), halign="center", valign="center", size=5);

        // Label background
        translate([0, -build_size / 2 - 10, 0])
            color("white")
                four_rounded_corner_plate(10, 90, 1, 2.5);
    }
}

/*
 * Create all preview guides at once
 * Only renders in preview mode ($preview == true)
 *
 * Parameters:
 *   rack_width - Rack width in inches
 *   units_required - Height in rack units
 *   cage_offset_x - Cage horizontal offset
 *   cage_depth - Cage depth
 *   heavy_device - Thickness setting
 *   build_size - Build volume size (0 to disable)
 *   mod_one_offset - Mod 1 offset (0 = disabled)
 *   mod_two_offset - Mod 2 offset (0 = disabled)
 */
module all_preview_guides(
    rack_width,
    units_required,
    cage_offset_x,
    cage_depth,
    heavy_device = 0,
    build_size = 0,
    mod_one_offset = 0,
    mod_two_offset = 0
)
{
    if ($preview)
    {
        horizontal_ruler(rack_width, units_required, heavy_device);
        height_marker(rack_width, cage_depth, heavy_device);
        cage_center_marker(cage_offset_x, units_required, cage_depth);

        if (build_size > 0)
            build_volume_outline(build_size);

        if (mod_one_offset != 0)
            mod_offset_marker(mod_one_offset, units_required, 10);

        if (mod_two_offset != 0)
            mod_offset_marker(mod_two_offset, units_required, 10);
    }
}
