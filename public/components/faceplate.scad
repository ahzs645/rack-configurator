/*
 * CageMaker PRCG - Faceplate Module
 * Modular Component: Rack faceplate generation with EIA-310 screw holes
 *
 * Based on CageMaker PRCG v0.21 by WebMaka
 * Original: https://github.com/WebMaka/CageMakerPRCG
 * License: CC BY-NC-SA 4.0
 */

use <utilities.scad>
use <constants.scad>

// EIA unit height constant
_EIA_UNIT = 44.45;
_INCH_MM = 25.4;

/*
 * Create a blank faceplate with EIA-310 standard screw holes
 * Optionally includes bolt-together ears for partial-width rack cages
 *
 * Parameters:
 *   desired_width - Faceplate width in inches
 *   unit_height - Height in rack units (U)
 *   ear_type - "None", "One Side", or "Both Sides"
 *   heavy_device - 0=standard 4mm, 1=5mm, 2=6mm thickness
 *   faceplate_radius - Corner radius (default 5mm)
 *   tap_hole_diameter - Diameter for tap/heat-set holes (0 = standard clearance)
 *   add_alignment_pins - Whether to add alignment pin holes
 *   reinforce_faceplate - Add right-angle bracing to back edges
 *   fn - Detail level for curves
 */
module create_blank_faceplate(
    desired_width,
    unit_height,
    ear_type = "None",
    heavy_device = 0,
    faceplate_radius = 5,
    tap_hole_diameter = 0,
    add_alignment_pins = false,
    reinforce_faceplate = false,
    fn = 64
)
{
    thickness = 4 + heavy_device;
    plate_width = desired_width * _INCH_MM;
    plate_height = unit_height * _EIA_UNIT - 0.79;

    difference()
    {
        // Create the faceplate body with optional ears
        _faceplate_body(
            plate_width, plate_height, thickness,
            ear_type, faceplate_radius, tap_hole_diameter,
            reinforce_faceplate, heavy_device, fn
        );

        // Add EIA-310 screw holes
        _faceplate_screw_holes(
            plate_width, plate_height, unit_height, thickness,
            ear_type, tap_hole_diameter, add_alignment_pins, heavy_device, fn
        );
    }
}

/*
 * Internal module: Create faceplate body with optional ears
 */
module _faceplate_body(
    plate_width, plate_height, thickness,
    ear_type, faceplate_radius, tap_hole_diameter,
    reinforce_faceplate, heavy_device, fn
)
{
    if (ear_type == "None")
    {
        union()
        {
            four_rounded_corner_plate(plate_height, plate_width, thickness, faceplate_radius, fn);

            // Faceplate reinforcing
            if (reinforce_faceplate)
            {
                _faceplate_reinforcement(plate_width, plate_height, thickness, heavy_device, 0, fn);
            }
        }
    }
    else if (ear_type == "One Side")
    {
        union()
        {
            two_rounded_corner_plate(plate_height, plate_width, thickness, faceplate_radius, fn);

            // Right-side ear
            translate([(plate_width / 2) - thickness - (tap_hole_diameter == 0 ? 0 : 2), 0, 14 + heavy_device - 1])
                rotate([0, 90, 0])
                    two_rounded_corner_plate(plate_height, 21, thickness + (tap_hole_diameter == 0 ? 0 : 2), 5, fn);

            // Faceplate reinforcing
            if (reinforce_faceplate)
            {
                _faceplate_reinforcement(plate_width, plate_height, thickness, heavy_device, 1, fn);
            }
        }
    }
    else if (ear_type == "Both Sides")
    {
        union()
        {
            four_rounded_corner_plate(plate_height, plate_width, thickness, 0.001, fn);

            // Right-side ear
            translate([(plate_width / 2) - thickness - (tap_hole_diameter == 0 ? 0 : 2), 0, 14 + heavy_device - 1])
                rotate([0, 90, 0])
                    two_rounded_corner_plate(plate_height, 21, thickness + (tap_hole_diameter == 0 ? 0 : 2), 5, fn);

            // Left-side ear
            translate([0 - (plate_width / 2), 0, 14 + heavy_device - 1])
                rotate([0, 90, 0])
                    two_rounded_corner_plate(plate_height, 21, thickness + (tap_hole_diameter == 0 ? 0 : 2), 5, fn);

            // Faceplate reinforcing
            if (reinforce_faceplate)
            {
                _faceplate_reinforcement(plate_width, plate_height, thickness, heavy_device, 2, fn);
            }
        }
    }
}

/*
 * Internal module: Add reinforcement to faceplate back edges
 */
module _faceplate_reinforcement(plate_width, plate_height, thickness, heavy_device, ear_mode, fn)
{
    // ear_mode: 0=None, 1=One Side, 2=Both Sides
    offset_x = (ear_mode == 1) ? 7.99 + (heavy_device / 2) :
               (ear_mode == 2) ? 0.01 : 0;

    reinf_width = (ear_mode == 0) ? plate_width - 33.75 :
                  (ear_mode == 1) ? plate_width - 20.875 + heavy_device :
                  plate_width - 0.02;

    reinf_radius = (ear_mode == 2) ? 1 : thickness;

    // Top reinforcement
    translate([offset_x, (plate_height + 0.79) / 2 - thickness, thickness + 0.001])
        rotate([0, 90, 90])
            two_rounded_corner_plate(reinf_width, thickness * 2, thickness - 0.395, reinf_radius, fn);

    // Bottom reinforcement
    translate([offset_x, 0 - (plate_height + 0.79) / 2 + 0.395, thickness + 0.001])
        rotate([0, 90, 90])
            two_rounded_corner_plate(reinf_width, thickness * 2, thickness - 0.395, reinf_radius, fn);
}

/*
 * Internal module: Create EIA-310 screw holes
 */
module _faceplate_screw_holes(
    plate_width, plate_height, unit_height, thickness,
    ear_type, tap_hole_diameter, add_alignment_pins, heavy_device, fn
)
{
    // EIA-310 standard screw spacing: 1/2-5/8-5/8 (6.35, 22.225, 38.1 mm)
    screw_y_positions = [6.35, 22.225, 38.1];

    for (unit_number = [0:unit_height])
    {
        // Left side screw holes
        if (ear_type != "Both Sides")
        {
            for (y = screw_y_positions)
            {
                faceplate_screw_hole_slot(
                    0 - (plate_width / 2) + 8,
                    (unit_number * _EIA_UNIT) - ((unit_height * _EIA_UNIT) / 2) + y,
                    -1,
                    thickness,
                    fn
                );
            }
        }
        else
        {
            // Bolt-together ear holes (left side)
            for (y = screw_y_positions)
            {
                translate([0 - (plate_width / 2) - 11, (unit_number * _EIA_UNIT) - ((unit_height * _EIA_UNIT) / 2) + y, 14 + heavy_device])
                    rotate([0, 90, 0])
                        linear_extrude(22, center=false, twist=0, $fn=fn)
                            circle(d = (tap_hole_diameter == 0 ? 5.5 : tap_hole_diameter), $fn=fn, false);

                // Alignment pin holes
                if (add_alignment_pins)
                    alignment_pin_hole(
                        0 - (plate_width / 2) + 2.5,
                        (unit_number * _EIA_UNIT) - ((unit_height * _EIA_UNIT) / 2) + y,
                        2 + (heavy_device / 2)
                    );
            }
        }

        // Right side screw holes
        if (ear_type == "None")
        {
            for (y = screw_y_positions)
            {
                faceplate_screw_hole_slot(
                    (plate_width / 2) - 8,
                    (unit_number * _EIA_UNIT) - ((unit_height * _EIA_UNIT) / 2) + y,
                    -1,
                    thickness,
                    fn
                );
            }
        }
        else
        {
            // Bolt-together ear holes (right side)
            for (y = screw_y_positions)
            {
                translate([(plate_width / 2) - 11, (unit_number * _EIA_UNIT) - ((unit_height * _EIA_UNIT) / 2) + y, 14 + heavy_device])
                    rotate([0, 90, 0])
                        linear_extrude(22, center=false, twist=0, $fn=fn)
                            circle(d = (tap_hole_diameter == 0 ? 5.5 : tap_hole_diameter), $fn=fn, false);

                // Alignment pin holes
                if (add_alignment_pins)
                    alignment_pin_hole(
                        (plate_width / 2) - 2.5,
                        (unit_number * _EIA_UNIT) - ((unit_height * _EIA_UNIT) / 2) + y,
                        2 + (heavy_device / 2)
                    );
            }
        }
    }
}
