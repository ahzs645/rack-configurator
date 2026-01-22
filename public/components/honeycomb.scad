/*
 * CageMaker PRCG - Honeycomb Ventilation Module
 * Modular Component: Honeycomb pattern for ventilated surfaces
 *
 * Based on honeycomb.scad from universal-rack-shelf by @jaredwolff
 * Adapted for CageMaker PRCG
 * License: CC BY-NC-SA 4.0
 */

/*
 * Create a single hexagon shape
 *
 * Parameters:
 *   d - Diameter of the hexagon (point to point)
 */
module hexagon(d) {
    circle(d=d, $fn=6);
}

/*
 * Create a 2D honeycomb pattern
 * This creates a rectangular area with hexagonal holes cut out
 *
 * Parameters:
 *   x - Width of the pattern area (mm)
 *   y - Height of the pattern area (mm)
 *   dia - Diameter of each hexagonal hole (mm)
 *   wall - Wall thickness between holes (mm)
 *
 * Geometry notes:
 *   smallDia = dia * cos(30) - effective height of hexagon
 *   projWall = wall * cos(30) - projected wall at 30 degrees
 *   Hexagons are staggered in alternating rows
 */
module honeycomb(x, y, dia, wall) {
    // Calculate hexagon geometry
    smallDia = dia * cos(30);
    projWall = wall * cos(30);

    // Calculate step sizes for pattern
    yStep = smallDia + wall;
    xStep = dia * 3/2 + projWall * 2;

    difference() {
        square([x, y]);

        // Create staggered hexagon pattern
        // +1 step to ensure full coverage
        for (yOffset = [0 : yStep : y + yStep], xOffset = [0 : xStep : x + xStep]) {
            // First row of hexagons
            translate([xOffset, yOffset])
                hexagon(dia);

            // Staggered second row
            translate([xOffset + dia * 3/4 + projWall, yOffset + (smallDia + wall) / 2])
                hexagon(dia);
        }
    }
}

/*
 * Apply honeycomb pattern to a child 2D shape
 * Creates a shape with honeycomb ventilation inside a border
 *
 * Parameters:
 *   border - Border/edge thickness to keep solid (mm)
 *   honey_dia - Diameter of hexagonal holes (mm)
 *   honey_wall - Wall thickness between holes (mm)
 *   honey_offset - [x, y] offset for pattern alignment (optional)
 *   honey_max - [x, y] maximum size of honeycomb area (optional)
 */
module honey_shape(border, honey_dia, honey_wall, honey_offset=[0, 0], honey_max=[500, 500]) {
    difference() {
        children();
        difference() {
            offset(r=-border) {
                children();
            }
            translate([-honey_offset[0], -honey_offset[1]]) {
                honeycomb(honey_max[0], honey_max[1], honey_dia, honey_wall);
            }
        }
    }
}

/*
 * Create a 3D honeycomb panel
 * Extrudes the honeycomb pattern to create a ventilated plate
 *
 * Parameters:
 *   width - Panel width (mm)
 *   height - Panel height (mm)
 *   thickness - Panel thickness (mm)
 *   border - Solid border around edges (mm)
 *   hex_dia - Diameter of hexagonal holes (mm)
 *   hex_wall - Wall thickness between holes (mm)
 *   hex_offset - [x, y] offset for pattern alignment (optional)
 */
module honeycomb_panel(width, height, thickness, border, hex_dia, hex_wall, hex_offset=[0, 0]) {
    linear_extrude(thickness) {
        honey_shape(border, hex_dia, hex_wall, honey_offset=hex_offset) {
            square([width, height], center=false);
        }
    }
}

/*
 * Create a centered 3D honeycomb panel
 * Same as honeycomb_panel but centered on origin
 *
 * Parameters:
 *   width - Panel width (mm)
 *   height - Panel height (mm)
 *   thickness - Panel thickness (mm)
 *   border - Solid border around edges (mm)
 *   hex_dia - Diameter of hexagonal holes (mm)
 *   hex_wall - Wall thickness between holes (mm)
 *   hex_offset - [x, y] offset for pattern alignment (optional)
 */
module honeycomb_panel_centered(width, height, thickness, border, hex_dia, hex_wall, hex_offset=[0, 0]) {
    translate([-width/2, -height/2, 0])
        honeycomb_panel(width, height, thickness, border, hex_dia, hex_wall, hex_offset);
}

/*
 * Create a 2D pattern of hexagons (just the holes, no frame)
 * Use this for subtraction to create honeycomb ventilation
 *
 * Parameters:
 *   x - Width of the pattern area (mm)
 *   y - Height of the pattern area (mm)
 *   dia - Diameter of each hexagonal hole (mm)
 *   wall - Wall thickness between holes (mm)
 */
module hexagon_pattern(x, y, dia, wall) {
    // Calculate hexagon geometry
    smallDia = dia * cos(30);
    projWall = wall * cos(30);

    // Calculate step sizes for pattern
    yStep = smallDia + wall;
    xStep = dia * 3/2 + projWall * 2;

    // Create staggered hexagon pattern (just the hexagons, no frame)
    for (yOffset = [0 : yStep : y + yStep], xOffset = [0 : xStep : x + xStep]) {
        // First row of hexagons
        translate([xOffset, yOffset])
            hexagon(dia);

        // Staggered second row
        translate([xOffset + dia * 3/4 + projWall, yOffset + (smallDia + wall) / 2])
            hexagon(dia);
    }
}

/*
 * Create a honeycomb cutout for subtraction from existing geometry
 * Use this with difference() to add ventilation holes to existing parts
 *
 * Parameters:
 *   width - Cutout width (mm)
 *   height - Cutout height (mm)
 *   thickness - Cutout depth - should exceed material thickness (mm)
 *   hex_dia - Diameter of hexagonal holes (mm)
 *   hex_wall - Wall thickness between holes (mm)
 *   hex_offset - [x, y] offset for pattern alignment (optional)
 */
module honeycomb_cutout(width, height, thickness, hex_dia, hex_wall, hex_offset=[0, 0]) {
    // Clip the hexagon pattern to the desired area
    translate([0, 0, -thickness/2])
        linear_extrude(thickness) {
            intersection() {
                // Boundary rectangle
                square([width, height], center=true);

                // Hexagon pattern centered - offset by hex_dia to ensure full coverage on all edges
                translate([-width/2 - hex_dia - hex_offset[0], -height/2 - hex_dia - hex_offset[1]])
                    hexagon_pattern(width + hex_dia * 2, height + hex_dia * 2, hex_dia, hex_wall);
            }
        }
}
