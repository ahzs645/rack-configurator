/*
 * CageMaker PRCG - Keystone Module Component
 * Modular Component: Keystone jack receptacles for faceplate modifications
 *
 * Based on CageMaker PRCG v0.21 by WebMaka
 * Original Keystone Library by @grauerfuchs (CC BY-SA)
 * https://github.com/grauerfuchs/OpenSCAD_Libs/blob/master/keystone.scad
 * License: CC BY-NC-SA 4.0
 */

/*
 * Create a Keystone module jack shape for subtraction
 * This creates the negative space that a Keystone jack snaps into
 */
module keystone_module()
{
    translate([2, 2, 0])
        union()
        {
            // Jack face opening
            translate([1.75, 0, -0.001])
                cube([16.5, 15, 10.001]);

            // Jack back opening (wider for cable clearance)
            translate([1.75, 0, 8])
                cube([19.5, 15, 3.001]);

            // Clip catches (where the jack snaps in)
            translate([0, 0, 5.5])
                cube([23, 15, 3.5]);

            // Fix the edge of the clip catch for easier insertion
            translate([15, 0, 2])
                rotate([0, 40, 0])
                    cube([3, 15, 7]);
        }
}

/*
 * Create a receptacle block to hold a single Keystone module
 * This is the positive shape that gets added to the faceplate
 */
module keystone_receptacle()
{
    difference()
    {
        cube([27, 19, 11]);
        keystone_module();
    }
}

/*
 * Create a single Keystone jack block for faceplate
 * Positioned at specified offset from center
 *
 * Parameters:
 *   offset_x - Horizontal offset from faceplate center
 */
module keystone_1x1(offset_x)
{
    translate([offset_x, 2.5, 5.5])
        cube([19, 27, 11], center=true);
}

/*
 * Create a 2x1 Keystone array (2 side-by-side)
 *
 * Parameters:
 *   offset_x - Horizontal offset from faceplate center
 */
module keystone_2x1(offset_x)
{
    translate([offset_x - 11.5, 2.5, 5.5])
        cube([19, 27, 11], center=true);
    translate([offset_x + 11.5, 2.5, 5.5])
        cube([19, 27, 11], center=true);
}

/*
 * Create a 3x1 Keystone array (3 side-by-side)
 *
 * Parameters:
 *   offset_x - Horizontal offset from faceplate center
 */
module keystone_3x1(offset_x)
{
    translate([offset_x - 23, 2.5, 5.5])
        cube([19, 27, 11], center=true);
    translate([offset_x, 2.5, 5.5])
        cube([19, 27, 11], center=true);
    translate([offset_x + 23, 2.5, 5.5])
        cube([19, 27, 11], center=true);
}

/*
 * Create a 1x2 Keystone array (2 stacked vertically)
 *
 * Parameters:
 *   offset_x - Horizontal offset from faceplate center
 */
module keystone_1x2(offset_x)
{
    translate([offset_x, -12.5, 5.5])
        cube([19, 27, 11], center=true);
    translate([offset_x, 17.5, 5.5])
        cube([19, 27, 11], center=true);
}

/*
 * Create a 2x2 Keystone array (4 in 2x2 grid)
 *
 * Parameters:
 *   offset_x - Horizontal offset from faceplate center
 */
module keystone_2x2(offset_x)
{
    translate([offset_x - 11.5, -12.5, 5.5])
        cube([19, 27, 11], center=true);
    translate([offset_x + 11.5, -12.5, 5.5])
        cube([19, 27, 11], center=true);
    translate([offset_x - 11.5, 17.5, 5.5])
        cube([19, 27, 11], center=true);
    translate([offset_x + 11.5, 17.5, 5.5])
        cube([19, 27, 11], center=true);
}

/*
 * Create a 3x2 Keystone array (6 in 3x2 grid)
 *
 * Parameters:
 *   offset_x - Horizontal offset from faceplate center
 */
module keystone_3x2(offset_x)
{
    translate([offset_x - 23, -12.5, 5.5])
        cube([19, 27, 11], center=true);
    translate([offset_x, -12.5, 5.5])
        cube([19, 27, 11], center=true);
    translate([offset_x + 23, -12.5, 5.5])
        cube([19, 27, 11], center=true);
    translate([offset_x - 23, 17.5, 5.5])
        cube([19, 27, 11], center=true);
    translate([offset_x, 17.5, 5.5])
        cube([19, 27, 11], center=true);
    translate([offset_x + 23, 17.5, 5.5])
        cube([19, 27, 11], center=true);
}

/*
 * Cut Keystone jack openings from faceplate
 * This is the subtraction shape for creating the jack openings
 *
 * Parameters:
 *   offset_x - Horizontal offset from faceplate center
 *   type - Keystone configuration type
 */
module keystone_cutout(offset_x, type)
{
    if (type == "1x1Keystone")
    {
        translate([offset_x - 9.5, -11, 0])
            rotate([0, 0, 90])
                keystone_module();
    }
    else if (type == "2x1Keystone")
    {
        translate([offset_x - 9.5 - 11.5, -11, 0])
            rotate([0, 0, 90])
                keystone_module();
        translate([offset_x - 9.5 + 11.5, -11, 0])
            rotate([0, 0, 90])
                keystone_module();
    }
    else if (type == "3x1Keystone")
    {
        translate([offset_x - 9.5 - 23, -11, 0])
            rotate([0, 0, 90])
                keystone_module();
        translate([offset_x - 9.5, -11, 0])
            rotate([0, 0, 90])
                keystone_module();
        translate([offset_x - 9.5 + 23, -11, 0])
            rotate([0, 0, 90])
                keystone_module();
    }
    else if (type == "1x2Keystone")
    {
        translate([offset_x - 9.5, -26, 0])
            rotate([0, 0, 90])
                keystone_module();
        translate([offset_x - 9.5, 4, 0])
            rotate([0, 0, 90])
                keystone_module();
    }
    else if (type == "2x2Keystone")
    {
        translate([offset_x - 9.5 - 11.5, -26, 0])
            rotate([0, 0, 90])
                keystone_module();
        translate([offset_x - 9.5 + 11.5, -26, 0])
            rotate([0, 0, 90])
                keystone_module();
        translate([offset_x - 9.5 - 11.5, 4, 0])
            rotate([0, 0, 90])
                keystone_module();
        translate([offset_x - 9.5 + 11.5, 4, 0])
            rotate([0, 0, 90])
                keystone_module();
    }
    else if (type == "3x2Keystone")
    {
        translate([offset_x - 9.5 - 23, -26, 0])
            rotate([0, 0, 90])
                keystone_module();
        translate([offset_x - 9.5, -26, 0])
            rotate([0, 0, 90])
                keystone_module();
        translate([offset_x - 9.5 + 23, -26, 0])
            rotate([0, 0, 90])
                keystone_module();
        translate([offset_x - 9.5 - 23, 4, 0])
            rotate([0, 0, 90])
                keystone_module();
        translate([offset_x - 9.5, 4, 0])
            rotate([0, 0, 90])
                keystone_module();
        translate([offset_x - 9.5 + 23, 4, 0])
            rotate([0, 0, 90])
                keystone_module();
    }
}

/*
 * Create Keystone block addition based on type
 * Use this to add the solid block before cutting the jack opening
 *
 * Parameters:
 *   offset_x - Horizontal offset from faceplate center
 *   type - Keystone configuration type
 */
module keystone_block(offset_x, type)
{
    if (type == "1x1Keystone")
        keystone_1x1(offset_x);
    else if (type == "2x1Keystone")
        keystone_2x1(offset_x);
    else if (type == "3x1Keystone")
        keystone_3x1(offset_x);
    else if (type == "1x2Keystone")
        keystone_1x2(offset_x);
    else if (type == "2x2Keystone")
        keystone_2x2(offset_x);
    else if (type == "3x2Keystone")
        keystone_3x2(offset_x);
}
