/*
 * Rack Scad - Tray Rack Mount Type
 * Simple tray with front-rail mounting and optional screw mount points
 *
 * Use this for devices that need a flat surface to sit on,
 * like mini PCs, switches, or power supplies.
 */

include <common.scad>
use <../components/screws.scad>

// ============================================================================
// TRAY CONFIGURATION
// ============================================================================

// Default tray dimensions
DEFAULT_TRAY_WIDTH = 120;
DEFAULT_TRAY_DEPTH = 100;
DEFAULT_TRAY_THICKNESS = 3;

// Lip heights
DEFAULT_FRONT_LIP_HEIGHT = 10;
DEFAULT_BACK_LIP_HEIGHT = 10;
DEFAULT_SIDE_LIP_HEIGHT = 8;

// ============================================================================
// MAIN TRAY MODULE
// ============================================================================

/*
 * Create a rack-mounted tray
 *
 * Parameters:
 *   u - Number of rack units
 *   trayWidth - Width of the tray (internal)
 *   trayDepth - Depth of the tray
 *   trayThickness - Base thickness
 *   frontThickness - Front plate thickness
 *   sideThickness - Side wall thickness
 *   frontLipHeight - Height of front lip
 *   backLipHeight - Height of back lip
 *   sideLipHeight - Height of side lips (0 for no sides)
 *   leftPadding - Extra space on left side
 *   mountPoints - Array of [x, y] positions for device mount holes
 *   mountPointType - Screw type for mount points
 *   mountPointElevation - Height of mount point bosses
 *   sideSupport - Add diagonal support to ears
 *   ventilation - Add ventilation holes to base
 *   ventHoleSize - Size of ventilation holes
 */
module rack_tray(
    u = 1,
    trayWidth = DEFAULT_TRAY_WIDTH,
    trayDepth = DEFAULT_TRAY_DEPTH,
    trayThickness = DEFAULT_TRAY_THICKNESS,
    frontThickness = 3,
    sideThickness = 3,
    frontLipHeight = DEFAULT_FRONT_LIP_HEIGHT,
    backLipHeight = DEFAULT_BACK_LIP_HEIGHT,
    sideLipHeight = 0,
    leftPadding = 0,
    mountPoints = [],
    mountPointType = "M3",
    mountPointElevation = 5,
    sideSupport = true,
    ventilation = false,
    ventHoleSize = 5
) {
    lipThickness = sideThickness;

    // Calculate positions
    screwDx = rackMountScrewWidth;
    screwDz = screwDiff * u;

    minScrewToTraySpacing = railScrewHoleToInnerEdge;
    leftScrewDistToTray = minScrewToTraySpacing + leftPadding;

    leftScrewGlobalX = -leftScrewDistToTray;
    rightScrewGlobalX = screwDx + leftScrewGlobalX;

    // Validate tray width fits
    maxTrayWidth = screwDx - 2 * minScrewToTraySpacing - leftPadding;
    actualTrayWidth = min(trayWidth, maxTrayWidth);

    if (trayWidth > maxTrayWidth) {
        echo(str("WARNING: Tray width reduced from ", trayWidth, " to ", maxTrayWidth, " to fit rack"));
    }

    difference() {
        union() {
            // Main tray body
            translate([-sideThickness, -frontThickness, -trayThickness])
            _tray_body(
                actualTrayWidth + 2 * sideThickness,
                trayDepth + frontThickness,
                trayThickness,
                lipThickness,
                frontLipHeight,
                backLipHeight,
                sideLipHeight,
                sideThickness
            );

            // Left ear
            translate([leftScrewGlobalX, 0, rackMountScrewZDist])
            rack_ear(
                u = u,
                frontThickness = frontThickness,
                sideThickness = sideThickness,
                frontWidth = leftScrewDistToTray + rackMountScrewXDist + sideThickness,
                sideDepth = trayDepth - lipThickness,
                backPlaneHeight = trayThickness + backLipHeight,
                support = sideSupport
            );

            // Right ear
            translate([rightScrewGlobalX, 0, rackMountScrewZDist])
            mirror([1, 0, 0])
            rack_ear(
                u = u,
                frontThickness = frontThickness,
                sideThickness = sideThickness,
                frontWidth = rightScrewGlobalX - actualTrayWidth + rackMountScrewXDist + sideThickness,
                sideDepth = trayDepth - lipThickness,
                backPlaneHeight = trayThickness + backLipHeight,
                support = sideSupport
            );

            // Mount point bosses
            if (len(mountPoints) > 0) {
                for (point = mountPoints) {
                    translate([point[0], point[1], 0])
                    cylinder(
                        r = screw_radius_slacked(mountPointType) + 2,
                        h = mountPointElevation,
                        $fn = 32
                    );
                }
            }
        }

        // Mount point holes
        if (len(mountPoints) > 0) {
            for (point = mountPoints) {
                translate([point[0], point[1], -trayThickness - eps])
                countersunk_hole(
                    screwType = mountPointType,
                    screwDepth = trayThickness + mountPointElevation + 10,
                    headExtension = trayThickness + 1
                );
            }
        }

        // Ventilation holes
        if (ventilation) {
            _tray_ventilation(
                actualTrayWidth,
                trayDepth,
                trayThickness,
                ventHoleSize,
                frontThickness
            );
        }
    }
}

/*
 * Internal: Create tray body
 */
module _tray_body(
    width,
    depth,
    thickness,
    lipThickness,
    frontLipHeight,
    backLipHeight,
    sideLipHeight,
    sideThickness
) {
    // Base
    cube([width, depth, thickness]);

    // Front lip
    translate([0, 0, thickness])
    cube([width, lipThickness, frontLipHeight]);

    // Back lip
    translate([0, depth - lipThickness, thickness])
    cube([width, lipThickness, backLipHeight]);

    // Side lips (optional)
    if (sideLipHeight > 0) {
        // Left side
        translate([0, lipThickness, thickness])
        cube([sideThickness, depth - 2 * lipThickness, sideLipHeight]);

        // Right side
        translate([width - sideThickness, lipThickness, thickness])
        cube([sideThickness, depth - 2 * lipThickness, sideLipHeight]);
    }
}

/*
 * Internal: Add ventilation holes
 */
module _tray_ventilation(width, depth, thickness, holeSize, frontOffset) {
    spacing = holeSize * 2;
    margin = 10;

    startX = margin;
    startY = frontOffset + margin;
    endX = width - margin;
    endY = depth - margin;

    for (x = [startX:spacing:endX]) {
        for (y = [startY:spacing:endY]) {
            translate([x, y, -thickness - eps])
            cylinder(d = holeSize, h = thickness + 2 * eps, $fn = 6);
        }
    }
}

// ============================================================================
// SIMPLE TRAY (NO EARS)
// For use with external mounting
// ============================================================================

/*
 * Create a simple tray without rack ears
 * Use when you want to add your own mounting solution
 */
module simple_tray(
    width = 120,
    depth = 100,
    thickness = 3,
    lipHeight = 10,
    hasLips = true
) {
    difference() {
        union() {
            // Base
            cube([width, depth, thickness]);

            // Lips
            if (hasLips) {
                // Front
                cube([width, 3, lipHeight + thickness]);
                // Back
                translate([0, depth - 3, 0])
                cube([width, 3, lipHeight + thickness]);
                // Left
                cube([3, depth, lipHeight + thickness]);
                // Right
                translate([width - 3, 0, 0])
                cube([3, depth, lipHeight + thickness]);
            }
        }
    }
}

// ============================================================================
// EXAMPLE
// ============================================================================

module tray_example() {
    // Basic 2U tray
    color("SteelBlue")
    rack_tray(
        u = 2,
        trayWidth = 140,
        trayDepth = 120,
        frontLipHeight = 15,
        backLipHeight = 10,
        ventilation = true
    );

    // Tray with mount points (offset for visibility)
    color("LightGreen")
    translate([0, 150, 0])
    rack_tray(
        u = 1,
        trayWidth = 100,
        trayDepth = 80,
        mountPoints = [[20, 20], [80, 20], [20, 60], [80, 60]],
        mountPointType = "M3",
        mountPointElevation = 5
    );
}

// Uncomment to preview:
// tray_example();
