/*
 * CageMaker PRCG - Cage Structure Module
 * Modular Component: Main cage structure generation
 *
 * Based on CageMaker PRCG v0.21 by WebMaka
 * Original: https://github.com/WebMaka/CageMakerPRCG
 * License: CC BY-NC-SA 4.0
 */

use <utilities.scad>
use <honeycomb.scad>

// Constants
_EIA_UNIT = 44.45;
_INCH_MM = 25.4;

// Default honeycomb parameters
DEFAULT_HEX_DIA = 8;      // Diameter of hexagonal holes
DEFAULT_HEX_WALL = 2;     // Wall thickness between holes
DEFAULT_HEX_BORDER = 5;   // Solid border around edges

/*
 * Create the reinforcing block behind the faceplate
 * This provides support for the cage attachment
 *
 * Parameters:
 *   offset_x - Horizontal offset from center
 *   offset_y - Vertical offset from center
 *   total_width - Total width of cage structure
 *   total_height - Total height of cage structure
 *   heavy_device - Thickness setting (0, 1, 2)
 */
module reinforcing_block(offset_x, offset_y, total_width, total_height, heavy_device=0)
{
    translate([offset_x, offset_y, 7.5 + (heavy_device > 0 ? 2 : 0)])
        cube([total_width, total_height, 10], center=true);
}

/*
 * Create a side plate with ventilation (rectangular or honeycomb)
 *
 * Parameters:
 *   offset_x - Horizontal offset from center
 *   offset_y - Vertical offset from center
 *   height - Plate height
 *   depth - Plate depth (device depth + clearance)
 *   thickness - Material thickness
 *   device_height - Inner device height (for cutout sizing)
 *   device_depth - Inner device depth (for cutout sizing)
 *   cutout_edge - Edge margin for cutout
 *   cutout_radius - Corner radius for rectangular cutout
 *   support_radius - Corner radius for plate
 *   is_left - True for left side (mirrored corners)
 *   use_honeycomb - Use honeycomb pattern instead of rectangular
 *   hex_dia - Honeycomb hole diameter
 *   hex_wall - Honeycomb wall thickness
 *   fn - Detail level
 */
module side_plate(
    offset_x,
    offset_y,
    height,
    depth,
    thickness,
    device_height,
    device_depth,
    cutout_edge = 5,
    cutout_radius = 5,
    support_radius = 3,
    is_left = true,
    use_honeycomb = false,
    hex_dia = 8,
    hex_wall = 2,
    front_offset = 11,
    fn = 64
)
{
    heavy_offset = thickness > 4 ? 2 : 0;

    translate([offset_x, offset_y, (depth / 2) + front_offset + heavy_offset])
        rotate([90, 90, 90])
            difference()
            {
                two_rounded_corner_plate(height, depth, thickness, support_radius, fn);

                // Add ventilation if device is deep enough
                // Use cutout_edge to control margins (smaller = larger cutouts)
                if (device_depth > 20 + cutout_edge)
                {
                    // Reduced margins: 6mm for reinforcing block connection area
                    vent_width = device_depth - 6 - cutout_edge;
                    vent_height = device_height - cutout_edge;

                    if (use_honeycomb)
                    {
                        translate([2, 0, thickness/2])
                            honeycomb_cutout(vent_width, vent_height, thickness + 2, hex_dia, hex_wall);
                    }
                    else
                    {
                        translate([2, 0, -1])
                            four_rounded_corner_plate(vent_height, vent_width, thickness + 2, cutout_radius, fn);
                    }
                }
            }
}

/*
 * Create a top/bottom plate with ventilation (rectangular or honeycomb)
 *
 * Parameters:
 *   offset_x - Horizontal offset from center
 *   offset_y - Vertical offset from center
 *   width - Plate width
 *   depth - Plate depth
 *   thickness - Material thickness
 *   device_width - Inner device width (for cutout sizing)
 *   device_depth - Inner device depth (for cutout sizing)
 *   cutout_edge - Edge margin for cutout
 *   cutout_radius - Corner radius for rectangular cutout
 *   support_radius - Corner radius for plate
 *   extra_support - Whether to add center reinforcing
 *   use_honeycomb - Use honeycomb pattern instead of rectangular
 *   hex_dia - Honeycomb hole diameter
 *   hex_wall - Honeycomb wall thickness
 *   fn - Detail level
 */
module top_bottom_plate(
    offset_x,
    offset_y,
    width,
    depth,
    thickness,
    device_width,
    device_depth,
    cutout_edge = 5,
    cutout_radius = 5,
    support_radius = 3,
    extra_support = false,
    use_honeycomb = false,
    hex_dia = 8,
    hex_wall = 2,
    front_offset = 11,
    fn = 64
)
{
    heavy_device = thickness - 4;

    translate([offset_x, offset_y, (depth / 2) + front_offset + heavy_device])
        rotate([0, 90, 90])
            difference()
            {
                two_rounded_corner_plate(width, depth, thickness, support_radius, fn);

                // Use cutout_edge to control margins (smaller = larger cutouts)
                if (device_depth > 20 + cutout_edge)
                {
                    // Reduced margins: 6mm for reinforcing block connection area
                    vent_depth = device_depth - 6 - cutout_edge;

                    if (!extra_support)
                    {
                        vent_width = device_width - cutout_edge;
                        if (use_honeycomb)
                        {
                            translate([2, 0, thickness/2])
                                honeycomb_cutout(vent_depth, vent_width, thickness + 2, hex_dia, hex_wall);
                        }
                        else
                        {
                            translate([2, 0, -1])
                                four_rounded_corner_plate(vent_width, vent_depth, thickness + 2, cutout_radius, fn);
                        }
                    }
                    else
                    {
                        // Split cutout for extra support - two smaller vents with center bar
                        vent_width = (device_width - cutout_edge) / 2 - 8;
                        vent_offset = (device_width - cutout_edge) / 4 + 4;
                        if (use_honeycomb)
                        {
                            translate([2, vent_offset, thickness/2])
                                honeycomb_cutout(vent_depth, vent_width, thickness + 2, hex_dia, hex_wall);
                            translate([2, -vent_offset, thickness/2])
                                honeycomb_cutout(vent_depth, vent_width, thickness + 2, hex_dia, hex_wall);
                        }
                        else
                        {
                            translate([2, vent_offset, -1])
                                four_rounded_corner_plate(vent_width, vent_depth, thickness + 2, cutout_radius, fn);
                            translate([2, -vent_offset, -1])
                                four_rounded_corner_plate(vent_width, vent_depth, thickness + 2, cutout_radius, fn);
                        }
                    }
                }
            }
}

/*
 * Create back plate with ventilation (rectangular or honeycomb)
 *
 * Parameters:
 *   offset_x - Horizontal offset from center
 *   offset_y - Vertical offset from center
 *   device_width - Device width
 *   device_height - Device height
 *   device_depth - Device depth
 *   device_clearance - Clearance around device
 *   thickness - Material thickness
 *   cutout_edge - Edge margin for cutout
 *   cutout_radius - Corner radius for rectangular cutout
 *   use_honeycomb - Use honeycomb pattern instead of rectangular
 *   hex_dia - Honeycomb hole diameter
 *   hex_wall - Honeycomb wall thickness
 *   fn - Detail level
 */
module back_plate(
    offset_x,
    offset_y,
    device_width,
    device_height,
    device_depth,
    device_clearance,
    thickness,
    cutout_edge = 5,
    cutout_radius = 5,
    use_honeycomb = false,
    hex_dia = 8,
    hex_wall = 2,
    vent_open = true,
    fn = 64
)
{
    heavy_device = thickness - 4;

    translate([offset_x, offset_y, 2 + device_depth + device_clearance + heavy_device])
        difference()
        {
            cube([device_width + 2, device_height + 2, thickness], center=true);

            // Only add ventilation cutout if vent_open is true
            if (vent_open)
            {
                vent_width = device_width - cutout_edge;
                vent_height = device_height - cutout_edge;

                if (use_honeycomb)
                {
                    honeycomb_cutout(vent_width, vent_height, thickness + 2, hex_dia, hex_wall);
                }
                else
                {
                    translate([0, 0, -3 - (heavy_device > 0 ? 1 : 0)])
                        four_rounded_corner_plate(vent_height, vent_width, thickness + 2, cutout_radius, fn);
                }
            }
        }
}

/*
 * Create center support structure (for extra_support option)
 *
 * Parameters:
 *   offset_x - Horizontal offset from center
 *   offset_y - Vertical offset from center
 *   total_height - Total cage height
 *   device_depth - Device depth
 *   device_clearance - Clearance around device
 *   device_width - Device width
 *   device_height - Device height
 *   thickness - Material thickness
 *   support_radius - Corner radius
 *   is_split - Whether cage is split in half
 *   fn - Detail level
 */
module center_support(
    offset_x,
    offset_y,
    total_height,
    device_depth,
    device_clearance,
    device_width,
    device_height,
    thickness,
    support_radius = 3,
    is_split = false,
    fn = 64
)
{
    heavy_device = thickness - 4;
    heavy_offset = heavy_device > 0 ? 2 : 0;
    split_offset = is_split ? 8 : 0;

    // Left center support
    difference()
    {
        translate([offset_x - 2 - heavy_device - 10, offset_y, (device_depth + device_clearance) / 2 + 11 + heavy_offset - split_offset])
            rotate([90, 90, 90])
                two_rounded_corner_plate(total_height, device_depth + device_clearance - (is_split ? 12 : 0), thickness, support_radius, fn);

        translate([offset_x, offset_y, device_depth / 2])
            cube([device_width + device_clearance + 1, device_height + device_clearance + 1, device_depth + device_clearance + 50], center=true);
    }

    // Right center support
    difference()
    {
        translate([offset_x - 2 - heavy_device + 10, offset_y, (device_depth + device_clearance) / 2 + 11 + heavy_offset - split_offset])
            rotate([90, 90, 90])
                two_rounded_corner_plate(total_height, device_depth + device_clearance - (is_split ? 12 : 0), thickness, support_radius, fn);

        translate([offset_x, offset_y, device_depth / 2])
            cube([device_width + device_clearance + 1, device_height + device_clearance + 1, device_depth + device_clearance + 50], center=true);
    }
}

/*
 * Create complete cage structure (without faceplate)
 *
 * Parameters:
 *   offset_x - Horizontal offset from center
 *   offset_y - Vertical offset from center
 *   device_width - Device width in mm
 *   device_height - Device height in mm
 *   device_depth - Device depth in mm
 *   device_clearance - Clearance around device
 *   heavy_device - 0=standard, 1=thick, 2=super-thick
 *   extra_support - Add center reinforcing
 *   cutout_edge - Edge margin for ventilation cutouts
 *   cutout_radius - Corner radius for rectangular cutouts
 *   is_split - Whether cage will be split in half
 *   use_honeycomb - Use honeycomb pattern (false = rectangular cutouts)
 *   hex_dia - Honeycomb hole diameter (only used when use_honeycomb=true)
 *   hex_wall - Honeycomb wall thickness (only used when use_honeycomb=true)
 *   back_open - Whether back plate has ventilation (true) or is solid (false)
 *   no_back - If true, completely removes the back plate (overrides back_open)
 *   open_frame - If true, removes side/top/bottom plates (just reinforcing block + back)
 *   no_front - If true, removes the reinforcing block at the front
 *   fn - Detail level
 */
module cage_structure(
    offset_x,
    offset_y,
    device_width,
    device_height,
    device_depth,
    device_clearance,
    heavy_device = 0,
    extra_support = false,
    cutout_edge = 5,
    cutout_radius = 5,
    is_split = false,
    use_honeycomb = false,
    hex_dia = 8,
    hex_wall = 2,
    back_open = true,
    no_back = false,
    open_frame = false,
    no_front = false,
    fn = 64
)
{
    thickness = 4 + heavy_device;
    support_radius = 3 - heavy_device;

    total_width = device_width + 16 + (heavy_device * 2);
    total_height = device_height + 16 + (heavy_device * 2);

    // Front offset: 11mm normally (for reinforcing block), 0 when no_front
    _front_offset = no_front ? 0 : 11;

    // Reinforcing block behind faceplate with device opening cut through
    // Skip if no_front is true (for simple cage without front block)
    if (!no_front) {
        difference()
        {
            reinforcing_block(offset_x, offset_y, total_width, total_height, heavy_device);

            // Cut the device opening through the reinforcing block
            translate([offset_x, offset_y, 7.5 + (heavy_device > 0 ? 2 : 0)])
                cube([device_width + device_clearance, device_height + device_clearance, 12], center=true);
        }
    }

    // Side and top/bottom plates (skip if open_frame is true)
    if (!open_frame) {
        // Left side plate
        side_plate(
            offset_x - (device_width + device_clearance) / 2 - thickness - 0.001,
            offset_y,
            total_height,
            device_depth + device_clearance,
            thickness,
            device_height,
            device_depth,
            cutout_edge,
            cutout_radius,
            support_radius,
            true,
            use_honeycomb,
            hex_dia,
            hex_wall,
            _front_offset,
            fn
        );

        // Right side plate
        side_plate(
            offset_x + (device_width + device_clearance) / 2 + 0.001,
            offset_y,
            total_height,
            device_depth + device_clearance,
            thickness,
            device_height,
            device_depth,
            cutout_edge,
            cutout_radius,
            support_radius,
            false,
            use_honeycomb,
            hex_dia,
            hex_wall,
            _front_offset,
            fn
        );

        // Top plate
        top_bottom_plate(
            offset_x,
            (device_height + device_clearance) / 2 + 0.001 + offset_y,
            total_width,
            device_depth + device_clearance,
            thickness,
            device_width,
            device_depth,
            cutout_edge,
            cutout_radius,
            support_radius,
            extra_support,
            use_honeycomb,
            hex_dia,
            hex_wall,
            _front_offset,
            fn
        );

        // Bottom plate
        top_bottom_plate(
            offset_x,
            -(device_height + device_clearance) / 2 - thickness - 0.001 + offset_y,
            total_width,
            device_depth + device_clearance,
            thickness,
            device_width,
            device_depth,
            cutout_edge,
            cutout_radius,
            support_radius,
            extra_support,
            use_honeycomb,
            hex_dia,
            hex_wall,
            _front_offset,
            fn
        );

        // Extra center supports if enabled
        if (extra_support)
        {
            center_support(
                offset_x,
                offset_y,
                total_height,
                device_depth,
                device_clearance,
                device_width,
                device_height,
                thickness,
                support_radius,
                is_split,
                fn
            );
        }
    }

    // Back plate (only if no_back is false)
    if (!no_back) {
        back_plate(
            offset_x,
            offset_y,
            device_width,
            device_height,
            device_depth,
            device_clearance,
            thickness,
            cutout_edge,
            cutout_radius,
            use_honeycomb,
            hex_dia,
            hex_wall,
            back_open,
            fn
        );
    }
}

/*
 * Create split cage tab for joining halves
 *
 * Parameters:
 *   offset_x - Tab horizontal offset
 *   offset_y - Tab vertical offset
 *   z_pos - Z position of tab
 *   width - Tab width
 *   height - Tab height
 *   thickness - Tab thickness
 *   screw_hole_diameter - Diameter of screw hole
 *   fn - Detail level
 */
module split_cage_tab(offset_x, offset_y, z_pos, width, height, thickness, screw_hole_diameter, fn=64)
{
    difference()
    {
        translate([offset_x, offset_y, z_pos])
            rotate([90, 0, 0])
                four_rounded_corner_plate(height, width, thickness, 5, fn);

        // Screw hole
        translate([offset_x + 10, offset_y - thickness / 2, z_pos])
            rotate([90, 0, 0])
                cylinder(d=screw_hole_diameter, h=thickness * 2, $fn=fn, center=true);
    }
}

/*
 * Create groove for split cage tab attachment
 *
 * Parameters:
 *   offset_x - Groove horizontal offset
 *   offset_y - Groove vertical offset
 *   z_pos - Z position of groove
 *   width - Groove width
 *   height - Groove height
 *   thickness - Groove depth
 *   fn - Detail level
 */
module split_cage_groove(offset_x, offset_y, z_pos, width, height, thickness, fn=64)
{
    translate([offset_x, offset_y, z_pos])
        rotate([90, 0, 0])
            four_rounded_corner_plate(height, width, thickness, 5, fn);
}
