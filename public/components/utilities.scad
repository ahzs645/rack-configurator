/*
 * CageMaker PRCG - Utility Modules
 * Modular Component: Basic shape generation utilities
 *
 * Based on CageMaker PRCG v0.21 by WebMaka
 * Original: https://github.com/WebMaka/CageMakerPRCG
 * License: CC BY-NC-SA 4.0
 */

// Default detail level for curved surfaces
DEFAULT_FN = 64;

/*
 * Create a rectangular prism with TWO rounded corners
 * Used for side plates and support frames where one edge is flush
 *
 * Parameters:
 *   plate_height - Height of the plate (Y dimension)
 *   plate_width - Width of the plate (X dimension)
 *   plate_thickness - Thickness/depth of the plate (Z dimension)
 *   corner_radius - Radius for the rounded corners
 *   fn - Detail level for curves (optional, default 64)
 */
module two_rounded_corner_plate(plate_height, plate_width, plate_thickness, corner_radius, fn=DEFAULT_FN)
{
    linear_extrude(plate_thickness, center=false, twist=0, $fn=fn)
        hull()
        {
            // Left side - rounded corners
            translate([0-(plate_width / 2)+corner_radius, 0-(plate_height / 2)+corner_radius, 0])
                circle(r=corner_radius, $fn=fn);
            translate([0-(plate_width / 2)+corner_radius, (plate_height / 2)-corner_radius, 0])
                circle(r=corner_radius, $fn=fn);
            // Right side - sharp corners (nearly zero radius)
            translate([(plate_width / 2), 0-(plate_height / 2), 0])
                circle(r=0.001, $fn=fn);
            translate([(plate_width / 2), (plate_height / 2), 0])
                circle(r=0.001, $fn=fn);
        }
}

/*
 * Create a rectangular prism with FOUR rounded corners
 * Used for faceplates and general rectangular panels
 *
 * Parameters:
 *   plate_height - Height of the plate (Y dimension)
 *   plate_width - Width of the plate (X dimension)
 *   plate_thickness - Thickness/depth of the plate (Z dimension)
 *   corner_radius - Radius for all four corners
 *   fn - Detail level for curves (optional, default 64)
 */
module four_rounded_corner_plate(plate_height, plate_width, plate_thickness, corner_radius, fn=DEFAULT_FN)
{
    linear_extrude(plate_thickness)
        offset(r=corner_radius, $fn=fn)
            offset(delta=-corner_radius)
                square([plate_width, plate_height], center=true);
}

/*
 * Create an alignment pin hole for multi-part assembly
 * Uses standard 1.75mm filament as alignment dowels
 *
 * Parameters:
 *   xx - X position
 *   yy - Y position
 *   zz - Z position
 *   diameter - Hole diameter (optional, default 1.75mm)
 *   depth - Hole depth (optional, default 6mm)
 *   fn - Detail level for curves (optional, default 64)
 */
module alignment_pin_hole(xx, yy, zz, diameter=1.75, depth=6, fn=DEFAULT_FN)
{
    translate([xx, yy, zz])
        rotate([0, 90, 0])
            cylinder(d=diameter, h=depth, $fn=fn, center=true);
}

/*
 * Create a slotted screw hole for rack mounting
 * Sized for M5 or 10-32 screws with EIA-310 standard slot
 *
 * Parameters:
 *   xx - X position
 *   yy - Y position
 *   zz - Z position
 *   thickness - Material thickness (affects hole depth)
 *   fn - Detail level for curves (optional, default 64)
 */
module faceplate_screw_hole_slot(xx, yy, zz, thickness=4, fn=DEFAULT_FN)
{
    translate([xx, yy, zz])
        linear_extrude(6 + thickness, center=false, twist=0, $fn=fn)
        {
            hull()
            {
                translate([-2.5, 0, 0])
                    circle(d=5.5, $fn=fn, false);
                translate([2.5, 0, 0])
                    circle(d=5.5, $fn=fn, false);
            }
        }
}

/*
 * Create a simple cylindrical hole
 *
 * Parameters:
 *   xx - X position
 *   yy - Y position
 *   zz - Z position
 *   diameter - Hole diameter
 *   depth - Hole depth
 *   fn - Detail level for curves (optional, default 64)
 */
module simple_hole(xx, yy, zz, diameter, depth, fn=DEFAULT_FN)
{
    translate([xx, yy, zz])
        cylinder(d=diameter, h=depth, $fn=fn, center=true);
}
