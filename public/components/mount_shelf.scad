/*
 * Rack Scad - Shelf Mounts
 * Ventilated shelves, storage trays, and enhanced shelves with honeycomb
 *
 * License: CC BY-NC-SA 4.0
 */

use <honeycomb.scad>

_MSH_EPS = 0.01;
_MSH_DEFAULT_WALL = 3;

// ============================================================================
// VENTILATED SHELF
// Shelf with ventilation slots and optional cable routing
// Inspired by HomeRacker switch_shelf - great for network equipment
//
// Parameters:
//   width - Shelf width
//   depth - Shelf depth
//   thickness - Base thickness
//   lip_height - Height of retaining lips (0 for flat)
//   lip_sides - [front, back, left, right] which sides get lips
//   vent_slots - Add ventilation slots
//   cable_slot - Add cable routing slot at back
//   slot_length - Length of vent slots
//   slot_width - Width of vent slots
//   slot_spacing_x - X spacing between slots
//   slot_spacing_y - Y spacing between slots
// ============================================================================

module ventilated_shelf(
    width,
    depth,
    thickness = 3,
    lip_height = 5,
    lip_sides = [false, true, true, true],  // [front, back, left, right]
    vent_slots = true,
    cable_slot = true,
    slot_length = 40,
    slot_width = 6,
    slot_spacing_x = 50,
    slot_spacing_y = 30
) {
    lip_thick = 2;
    margin = 20;  // Margin from edges for vent slots

    difference() {
        union() {
            // Base plate
            cube([width, depth, thickness]);

            // Lips
            if (lip_height > 0) {
                // Front lip
                if (lip_sides[0])
                    cube([width, lip_thick, thickness + lip_height]);

                // Back lip
                if (lip_sides[1])
                    translate([0, depth - lip_thick, 0])
                    cube([width, lip_thick, thickness + lip_height]);

                // Left lip
                if (lip_sides[2])
                    cube([lip_thick, depth, thickness + lip_height]);

                // Right lip
                if (lip_sides[3])
                    translate([width - lip_thick, 0, 0])
                    cube([lip_thick, depth, thickness + lip_height]);
            }
        }

        // Ventilation slots
        if (vent_slots) {
            for (x = [margin : slot_spacing_x : width - margin - slot_length]) {
                for (y = [margin : slot_spacing_y : depth - margin]) {
                    translate([x, y - slot_width/2, -_MSH_EPS])
                    cube([slot_length, slot_width, thickness + 2*_MSH_EPS]);
                }
            }
        }

        // Cable routing slot at back
        if (cable_slot) {
            cable_w = min(width * 0.4, 120);
            cable_d = 10;
            translate([(width - cable_w)/2, depth - margin - cable_d, -_MSH_EPS])
            cube([cable_w, cable_d, thickness + 2*_MSH_EPS]);
        }
    }
}

// Positioned version for rack generator - builds directly in rack coordinates (Z = depth)
module ventilated_shelf_positioned(
    offset_x,
    offset_y,
    width,
    depth,
    device_h = 0,
    thickness = 3,
    lip_height = 5,
    vent_slots = true,
    cable_slot = true,
    plate_thick = 4
) {
    lip_thick = 2;
    margin = 20;
    slot_length = 40;
    slot_width = 6;
    slot_spacing_x = 50;
    slot_spacing_z = 30;
    // Use device_h if provided, otherwise use thickness as fallback
    y_offset = device_h > 0 ? device_h/2 : thickness;

    translate([offset_x - width/2, offset_y - y_offset, plate_thick])
    mirror([0, 0, 1]) {
        difference() {
            union() {
                // Base plate (extends in -Z for depth into rack)
                cube([width, thickness, depth]);

                // Lips (extend in +Y for height)
                if (lip_height > 0) {
                    // Back lip
                    translate([0, 0, depth - lip_thick])
                    cube([width, thickness + lip_height, lip_thick]);

                    // Left lip
                    cube([lip_thick, thickness + lip_height, depth]);

                    // Right lip
                    translate([width - lip_thick, 0, 0])
                    cube([lip_thick, thickness + lip_height, depth]);
                }
            }

            // Ventilation slots
            if (vent_slots) {
                for (x = [margin : slot_spacing_x : width - margin - slot_length]) {
                    for (z = [margin : slot_spacing_z : depth - margin]) {
                        translate([x, -_MSH_EPS, z - slot_width/2])
                        cube([slot_length, thickness + 2*_MSH_EPS, slot_width]);
                    }
                }
            }

            // Cable routing slot at back
            if (cable_slot) {
                cable_w = min(width * 0.4, 120);
                cable_d = 10;
                translate([(width - cable_w)/2, -_MSH_EPS, depth - margin - cable_d])
                cube([cable_w, thickness + 2*_MSH_EPS, cable_d]);
            }
        }
    }
}

// ============================================================================
// STORAGE TRAY
// Deep tray with walls for storing loose items, cables, tools, etc.
// Inspired by HomeRacker equipment_tray
//
// Parameters:
//   width - Tray outer width
//   depth - Tray outer depth
//   wall_height - Height of tray walls
//   wall_thickness - Thickness of walls
//   base_thickness - Thickness of base
//   dividers - Number of internal dividers (0 = none)
// ============================================================================

module storage_tray(
    width,
    depth,
    wall_height = 30,
    wall_thickness = 2,
    base_thickness = 3,
    dividers = 0
) {
    total_height = base_thickness + wall_height;

    difference() {
        // Outer shell
        cube([width, depth, total_height]);

        // Inner cavity
        translate([wall_thickness, wall_thickness, base_thickness])
        cube([width - wall_thickness*2, depth - wall_thickness*2, wall_height + _MSH_EPS]);
    }

    // Optional dividers
    if (dividers > 0) {
        divider_spacing = (width - wall_thickness*2) / (dividers + 1);
        for (i = [1 : dividers]) {
            translate([wall_thickness + i * divider_spacing - wall_thickness/2, wall_thickness, base_thickness])
            cube([wall_thickness, depth - wall_thickness*2, wall_height * 0.8]);
        }
    }
}

// Positioned version for rack generator - builds directly in rack coordinates (Z = depth)
module storage_tray_positioned(
    offset_x,
    offset_y,
    width,
    depth,
    wall_height = 30,
    device_h = 0,
    dividers = 0,
    plate_thick = 4
) {
    wall_thickness = 2;
    base_thickness = 3;
    // Use device_h for positioning if provided, otherwise use wall_height
    y_offset = device_h > 0 ? device_h/2 : wall_height/2;

    outer_width = width + 2 * wall_thickness;
    outer_depth = depth + 2 * wall_thickness;

    translate([offset_x - outer_width/2, offset_y + y_offset, 0])
    mirror([0, 1, 0]) {
        difference() {
            // Outer shell (extends in -Z for depth into rack, Y for height)
            cube([outer_width, base_thickness + wall_height, outer_depth]);

            // Inner cavity
            translate([wall_thickness, base_thickness, wall_thickness])
            cube([width, wall_height + _MSH_EPS, depth]);
        }

        // Optional dividers
        if (dividers > 0) {
            divider_spacing = width / (dividers + 1);
            for (i = [1 : dividers]) {
                translate([wall_thickness + i * divider_spacing - wall_thickness/2, base_thickness, wall_thickness])
                cube([wall_thickness, wall_height * 0.8, depth]);
            }
        }
    }
}

// ============================================================================
// ENHANCED SHELF
// Full-featured shelf inspired by universal-rack-shelf project
// Features: honeycomb ventilation, side supports, LED notch, screw holes
//
// Parameters:
//   width - Shelf width (mm)
//   depth - Shelf depth (mm)
//   height - Wall/lip height (mm)
//   thickness - Base/wall thickness (mm)
//   use_honeycomb - Use honeycomb pattern (true) or rectangular slots (false)
//   hex_dia - Honeycomb hole diameter (mm)
//   hex_wall - Honeycomb wall thickness (mm)
//   notch - LED notch position: "none", "left", "right", "center"
//   notch_size - [width, height, depth] of notch (mm)
//   screw_holes - Number of auto-positioned screw holes (0-5)
//   screw_inner_dia - Inner screw hole diameter (mm)
//   screw_outer_dia - Outer screw hole diameter (mm)
//   cable_holes_left - Number of cable holes on left side (0-5)
//   cable_holes_right - Number of cable holes on right side (0-5)
//   cable_hole_dia - Cable hole diameter (mm)
//   top_support_depth - Depth of top support beam (mm)
// ============================================================================

module enhanced_shelf(
    width,
    depth,
    height,
    thickness = 3,
    use_honeycomb = true,
    hex_dia = 8,
    hex_wall = 2,
    notch = "none",
    notch_size = [100, 5, 15],
    screw_holes = 0,
    screw_inner_dia = 3,
    screw_outer_dia = 8,
    cable_holes_left = 0,
    cable_holes_right = 0,
    cable_hole_dia = 8,
    top_support_depth = 20
) {
    // Calculate derived dimensions
    // Keep screw holes centered on the original device width
    inner_width = width;
    top_thickness = min(height * 0.5, 7);  // Top beam thickness

    difference() {
        union() {
            // ============================================
            // Bottom shelf plate with honeycomb
            // ============================================
            if (use_honeycomb) {
                linear_extrude(thickness) {
                    honey_shape(thickness, hex_dia, hex_wall) {
                        translate([-thickness, 0])
                        square([width + 2*thickness, depth]);
                    }
                }
            } else {
                // Rectangular slot ventilation
                translate([-thickness, 0, 0])
                _shelf_rect_vent_base(width + 2*thickness, depth, thickness);
            }

            // ============================================
            // Side walls with honeycomb
            // ============================================
            for (side = [0, 1]) {
                // Adjust x_offset to account for -X extrusion after rotation
                // Side 0 (Left): 0 -> extends to -thickness
                // Side 1 (Right): width + thickness -> extends to width
                x_offset = side == 0 ? 0 : width + thickness;

                translate([x_offset, 0, thickness]) {
                    if (use_honeycomb) {
                        rotate([0, -90, 0])
                        linear_extrude(thickness) {
                            honey_shape(thickness, hex_dia, hex_wall) {
                                // Trapezoidal side wall profile - extends downward from shelf
                                // U=Height(Z), V=Depth(Y). Positive Z maps to Down in Rack.
                                polygon([
                                    [0, 0],
                                    [0, depth],
                                    [height, top_support_depth],
                                    [height, 0]
                                ]);
                            }
                        }
                    } else {
                        rotate([0, -90, 0])
                        linear_extrude(thickness) {
                            polygon([
                                [0, 0],
                                [0, depth],
                                [height, top_support_depth],
                                [height, 0]
                            ]);
                        }
                    }
                }
            }

            // ============================================
            // Support triangles at corners (extending down from shelf)
            // ============================================
            _shelf_support_triangle_length = min(height * 0.8, depth * 0.3);
            for (side = [0, 1]) {
                // Same x_offset adjustment as side walls
                x_offset = side == 0 ? 0 : width + thickness;

                translate([x_offset, 0, thickness]) {
                    rotate([0, -90, 0])
                    linear_extrude(thickness) {
                        polygon([
                            [0, 0],
                            [0, _shelf_support_triangle_length],
                            [_shelf_support_triangle_length, 0]
                        ]);
                    }
                }
            }

            // ============================================
            // Screw hole standoffs (if any)
            // ============================================
            if (screw_holes > 0) {
                _shelf_screw_positions = _get_shelf_screw_positions(inner_width, depth, screw_holes, thickness);
                for (pos = _shelf_screw_positions) {
                    translate([pos[0], pos[1], 0]) {
                        difference() {
                            cylinder(h = thickness, d = screw_outer_dia, $fn = 24);
                            translate([0, 0, -_MSH_EPS])
                            cylinder(h = thickness + 2*_MSH_EPS, d = screw_inner_dia, $fn = 16);
                        }
                    }
                }
            }
        }

        // ============================================
        // Subtract: LED notch
        // ============================================
        if (notch != "none") {
            notch_x = notch == "left" ? width - notch_size[0] - thickness :
                      notch == "right" ? thickness :
                      (width - notch_size[0]) / 2;  // center

            translate([notch_x, height - notch_size[1], notch_size[2]])
            rotate([0, 90, 0])
            linear_extrude(notch_size[0]) {
                polygon([
                    [0, 0],
                    [notch_size[2], notch_size[1]],
                    [notch_size[2], 0]
                ]);
            }
        }

        // ============================================
        // Subtract: Cable holes (left side)
        // ============================================
        if (cable_holes_left > 0) {
            spacing = (depth - 20) / (cable_holes_left + 1);
            for (i = [1 : cable_holes_left]) {
                // Move to -thickness to cut through the left wall
                translate([-thickness -_MSH_EPS, 10 + i * spacing, height / 2])
                rotate([0, 90, 0])
                cylinder(h = thickness + 2*_MSH_EPS, d = cable_hole_dia, $fn = 24);
            }
        }

        // ============================================
        // Subtract: Cable holes (right side)
        // ============================================
        if (cable_holes_right > 0) {
            spacing = (depth - 20) / (cable_holes_right + 1);
            for (i = [1 : cable_holes_right]) {
                // Move to width to cut through the right wall
                translate([width - _MSH_EPS, 10 + i * spacing, height / 2])
                rotate([0, 90, 0])
                cylinder(h = thickness + 2*_MSH_EPS, d = cable_hole_dia, $fn = 24);
            }
        }

        // ============================================
        // Subtract: Screw through-holes
        // ============================================
        if (screw_holes > 0) {
            _shelf_screw_positions = _get_shelf_screw_positions(inner_width, depth, screw_holes, thickness);
            for (pos = _shelf_screw_positions) {
                translate([pos[0], pos[1], -_MSH_EPS])
                cylinder(h = thickness + 2*_MSH_EPS, d = screw_inner_dia, $fn = 16);
            }
        }
    }
}

// Helper: Calculate screw positions based on count
function _get_shelf_screw_positions(width, depth, count, margin) =
    count == 1 ? [[width/2 + margin, depth/2]] :
    count == 2 ? [[margin + 15, depth/2], [width - 15, depth/2]] :
    count == 3 ? [[margin + 15, depth * 0.3], [width/2 + margin, depth * 0.7], [width - 15, depth * 0.3]] :
    count == 4 ? [[margin + 15, depth * 0.25], [width - 15, depth * 0.25],
                  [margin + 15, depth * 0.75], [width - 15, depth * 0.75]] :
    count >= 5 ? [[margin + 15, depth * 0.25], [width/2 + margin, depth * 0.25], [width - 15, depth * 0.25],
                  [margin + 15, depth * 0.75], [width - 15, depth * 0.75]] :
    [];

// Helper: Create rectangular vent slots for non-honeycomb mode
module _shelf_rect_vent_base(width, depth, thickness) {
    slot_length = 40;
    slot_width = 6;
    margin = 20;
    spacing_x = 50;
    spacing_y = 30;

    difference() {
        cube([width, depth, thickness]);

        for (x = [margin : spacing_x : width - margin - slot_length]) {
            for (y = [margin : spacing_y : depth - margin]) {
                translate([x, y - slot_width/2, -_MSH_EPS])
                cube([slot_length, slot_width, thickness + 2*_MSH_EPS]);
            }
        }
    }
}

// ============================================================================
// ENHANCED SHELF - POSITIONED VERSION
// Wrapper that positions the shelf in rack coordinates (Z = depth into rack)
//
// Additional Parameters:
//   offset_x - X offset from rack center (mm)
//   offset_y - Y offset from rack center (mm)
//   plate_thick - Faceplate thickness (mm)
// ============================================================================

module enhanced_shelf_positioned(
    offset_x,
    offset_y,
    width,
    depth,
    device_h,
    thickness = 3,
    use_honeycomb = true,
    hex_dia = 8,
    hex_wall = 2,
    notch = "none",
    notch_size = [100, 5, 15],
    screw_holes = 0,
    screw_inner_dia = 3,
    screw_outer_dia = 8,
    cable_holes_left = 0,
    cable_holes_right = 0,
    cable_hole_dia = 8,
    top_support_depth = 20,
    plate_thick = 4
) {
    // Position shelf so the platform is at the bottom of the cutout
    // After rotate([90,0,0]), the shelf geometry is inverted in Y
    // Offset by thickness so the top surface of the platform aligns with cutout bottom

    translate([offset_x - width/2, offset_y + device_h/2 + thickness, plate_thick])
    rotate([90, 0, 0])
    enhanced_shelf(
        width = width,
        depth = depth,
        height = device_h > 0 ? device_h : 30,
        thickness = thickness,
        use_honeycomb = use_honeycomb,
        hex_dia = hex_dia,
        hex_wall = hex_wall,
        notch = notch,
        notch_size = notch_size,
        screw_holes = screw_holes,
        screw_inner_dia = screw_inner_dia,
        screw_outer_dia = screw_outer_dia,
        cable_holes_left = cable_holes_left,
        cable_holes_right = cable_holes_right,
        cable_hole_dia = cable_hole_dia,
        top_support_depth = top_support_depth
    );
}
