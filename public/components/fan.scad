/*
 * CageMaker PRCG - Fan Module Component
 * Modular Component: Fan grill cutouts and mounting holes
 *
 * Based on CageMaker PRCG v0.21 by WebMaka
 * Original: https://github.com/WebMaka/CageMakerPRCG
 * License: CC BY-NC-SA 4.0
 */

// Default detail level for curved surfaces
DEFAULT_FN = 64;

// Fan mounting hole centers (distance between corner screws)
FAN_SCREW_CENTERS = [
    [30, 24],    // 30mm fan
    [40, 32],    // 40mm fan
    [60, 50],    // 60mm fan
    [80, 71.5],  // 80mm fan
];

/*
 * Create a decorative fan grill cutout pattern
 * Creates concentric rings with radial spokes
 *
 * Parameters:
 *   size - Overall diameter of the grill (typically fan size)
 *   fn - Detail level for curves (optional, default 64)
 */
module fan_grill_cutout(size, fn=DEFAULT_FN)
{
    difference()
    {
        // Create concentric rings
        for (i = [17:10:size - 3])
        {
            difference()
            {
                cylinder(h=10, d=i, center=true, $fn=fn);
                cylinder(h=10.2, d=i-7, center=true, $fn=fn);
            }
        }

        // Create radial spokes (3 at 60-degree intervals)
        rotate([0, 0, 0])
            cube([2.5, size, 10.2], center=true);
        rotate([0, 0, 60])
            cube([2.5, size, 10.2], center=true);
        rotate([0, 0, 120])
            cube([2.5, size, 10.2], center=true);
    }
}

/*
 * Create fan mounting screw holes at specified offset
 * Creates 4 corner holes for standard fan mounting
 *
 * Parameters:
 *   center_offset - X offset from faceplate center
 *   screw_centers - Distance between mounting holes (corner to corner)
 *   hole_diameter - Diameter of mounting holes
 *   fn - Detail level for curves (optional, default 64)
 */
module fan_screw_holes(center_offset, screw_centers, hole_diameter, fn=DEFAULT_FN)
{
    // Bottom-left screw
    translate([center_offset - (screw_centers / 2), 0 - (screw_centers / 2), 3.5])
        rotate([0, 0, 90])
            cylinder(h=10, d=hole_diameter, center=true, $fn=fn);

    // Bottom-right screw
    translate([center_offset + (screw_centers / 2), 0 - (screw_centers / 2), 3.5])
        rotate([0, 0, 90])
            cylinder(h=10, d=hole_diameter, center=true, $fn=fn);

    // Top-left screw
    translate([center_offset - (screw_centers / 2), (screw_centers / 2), 3.5])
        rotate([0, 0, 90])
            cylinder(h=10, d=hole_diameter, center=true, $fn=fn);

    // Top-right screw
    translate([center_offset + (screw_centers / 2), (screw_centers / 2), 3.5])
        rotate([0, 0, 90])
            cylinder(h=10, d=hole_diameter, center=true, $fn=fn);
}

/*
 * Get screw center distance for a given fan size
 *
 * Parameters:
 *   fan_size - Fan size in mm (30, 40, 60, or 80)
 */
function get_fan_screw_centers(fan_size) =
    FAN_SCREW_CENTERS[search(fan_size, FAN_SCREW_CENTERS)[0]][1];

/*
 * Create complete fan cutout with grill and screw holes
 * For subtraction from faceplate
 *
 * Parameters:
 *   offset_x - Horizontal offset from faceplate center
 *   fan_size - Fan size in mm (30, 40, 60, or 80)
 *   screw_hole_diameter - Diameter for mounting screw holes (default 3.5mm for M3)
 *   fn - Detail level for curves (optional, default 64)
 */
module fan_cutout_complete(offset_x, fan_size, screw_hole_diameter=3.5, fn=DEFAULT_FN)
{
    screw_centers = get_fan_screw_centers(fan_size);

    // Grill pattern
    translate([offset_x, 0, 3.5])
        fan_grill_cutout(fan_size, fn);

    // Mounting holes
    fan_screw_holes(offset_x, screw_centers, screw_hole_diameter, fn);
}

/*
 * Create a fan cutout based on type string
 *
 * Parameters:
 *   offset_x - Horizontal offset from faceplate center
 *   type - Fan type string ("30mmFan", "40mmFan", "60mmFan", "80mmFan")
 *   screw_hole_diameter - Diameter for mounting screw holes
 *   fn - Detail level for curves
 */
module fan_cutout_by_type(offset_x, type, screw_hole_diameter=3.5, fn=DEFAULT_FN)
{
    if (type == "30mmFan")
        fan_cutout_complete(offset_x, 30, screw_hole_diameter, fn);
    else if (type == "40mmFan")
        fan_cutout_complete(offset_x, 40, screw_hole_diameter, fn);
    else if (type == "60mmFan")
        fan_cutout_complete(offset_x, 60, screw_hole_diameter, fn);
    else if (type == "80mmFan")
        fan_cutout_complete(offset_x, 80, screw_hole_diameter, fn);
}

/*
 * Create fan block addition (solid area behind faceplate for fan)
 * This is added before cutting the grill pattern
 *
 * Parameters:
 *   offset_x - Horizontal offset from faceplate center
 *   fan_size - Fan size in mm
 */
module fan_block(offset_x, fan_size)
{
    block_size = fan_size + 5;
    translate([offset_x, 0, 5.5])
        cube([block_size, block_size, 11], center=true);
}

/*
 * Create fan block based on type string
 *
 * Parameters:
 *   offset_x - Horizontal offset from faceplate center
 *   type - Fan type string ("30mmFan", "40mmFan", "60mmFan", "80mmFan")
 */
module fan_block_by_type(offset_x, type)
{
    if (type == "30mmFan")
        fan_block(offset_x, 30);
    else if (type == "40mmFan")
        fan_block(offset_x, 40);
    else if (type == "60mmFan")
        fan_block(offset_x, 60);
    else if (type == "80mmFan")
        fan_block(offset_x, 80);
}
