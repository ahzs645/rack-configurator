/*
 * Rack Scad - Enclosed Box Rack Mount Type
 * Based on rackstack-main enclosed-box implementation
 *
 * This system uses side rails and a front plate to hold a box
 * that doesn't have its own mounting holes.
 */

include <common.scad>
use <../components/screws.scad>

// ============================================================================
// CONFIGURATION
// ============================================================================

DEFAULT_BOX_WIDTH = 160;
DEFAULT_BOX_HEIGHT = 27;
DEFAULT_BOX_DEPTH = 120;

DEFAULT_RAIL_THICKNESS = 1.5;
DEFAULT_RAIL_SIDE_THICKNESS = 3;
DEFAULT_FRONT_PLATE_THICKNESS = 3;

// ============================================================================
// ENCLOSED BOX SYSTEM
// ============================================================================

/*
 * Create a complete enclosed box mounting system
 *
 * Parameters:
 *   boxWidth - Width of the box to mount
 *   boxHeight - Height of the box
 *   boxDepth - Depth of the box
 *   railDefaultThickness - Default thickness for rail top/bottom
 *   railSideThickness - Side wall thickness
 *   frontPlateThickness - Front plate thickness
 *   frontPlateCutoutXSpace - X margin for front cutout
 *   frontPlateCutoutYSpace - Y margin for front cutout
 *   zOrientation - "middle" or "bottom"
 *   recessSideRail - Recess the side rail for wider boxes
 *   visualize - Show box preview
 *   splitForPrint - Separate parts for printing
 */
module enclosed_box_system(
    boxWidth = DEFAULT_BOX_WIDTH,
    boxHeight = DEFAULT_BOX_HEIGHT,
    boxDepth = DEFAULT_BOX_DEPTH,
    railDefaultThickness = DEFAULT_RAIL_THICKNESS,
    railSideThickness = DEFAULT_RAIL_SIDE_THICKNESS,
    frontPlateThickness = DEFAULT_FRONT_PLATE_THICKNESS,
    frontPlateCutoutXSpace = 5,
    frontPlateCutoutYSpace = 3,
    zOrientation = "middle",
    recessSideRail = false,
    visualize = false,
    splitForPrint = false
) {
    u = findU(boxHeight, railDefaultThickness);
    railBottomThick = railBottomThickness(u, boxHeight, railDefaultThickness, zOrientation);

    if (visualize) {
        // Show the box being mounted (transparent)
        %cube([boxWidth, boxDepth, boxHeight]);
    }

    if (splitForPrint) {
        // Left rail
        color("SteelBlue")
        side_support_rail_base(
            top = true,
            recess = recessSideRail,
            defaultThickness = railDefaultThickness,
            supportedZ = boxHeight,
            supportedY = boxDepth,
            supportedX = boxWidth,
            zOrientation = zOrientation,
            railSideThickness = railSideThickness
        );

        // Right rail (mirrored)
        color("SteelBlue")
        translate([sideRailBaseWidth * 2 + 10, 0, 0])
        mirror([1, 0, 0])
        translate([-sideRailBaseWidth, 0, 0])
        side_support_rail_base(
            top = true,
            recess = recessSideRail,
            defaultThickness = railDefaultThickness,
            supportedZ = boxHeight,
            supportedY = boxDepth,
            supportedX = boxWidth,
            zOrientation = zOrientation,
            railSideThickness = railSideThickness
        );

        // Front plate
        color("Coral")
        mirror([0, 1, 0])
        translate([0, uDiff, frontPlateThickness - railBottomThick])
        front_box_holder(
            plateThickness = frontPlateThickness,
            cutoutOffsetX = (rackMountScrewWidth - (boxWidth - 2 * frontPlateCutoutXSpace)) / 2,
            cutoutOffsetY = railBottomThick + frontPlateCutoutYSpace,
            cutoutX = boxWidth - 2 * frontPlateCutoutXSpace,
            cutoutY = boxHeight - 2 * frontPlateCutoutYSpace,
            zOrientation = zOrientation,
            supportedZ = boxHeight,
            supportWidth = max(10, boxWidth - (sideRailBaseWidth + 10)),
            supportRailDefaultThickness = railDefaultThickness
        );
    } else {
        // Assembled view

        // Left rail
        color("SteelBlue")
        side_support_rail_base(
            top = true,
            recess = recessSideRail,
            defaultThickness = railDefaultThickness,
            supportedZ = boxHeight,
            supportedY = boxDepth,
            supportedX = boxWidth,
            zOrientation = zOrientation,
            railSideThickness = railSideThickness
        );

        // Right rail
        color("SteelBlue")
        translate([boxWidth, 0, 0])
        mirror([1, 0, 0])
        side_support_rail_base(
            top = true,
            recess = recessSideRail,
            defaultThickness = railDefaultThickness,
            supportedZ = boxHeight,
            supportedY = boxDepth,
            supportedX = boxWidth,
            zOrientation = zOrientation,
            railSideThickness = railSideThickness
        );

        // Front plate (positioned at front)
        color("Coral")
        translate([railSideThickness - (railSupportsDx - boxWidth) / 2, 0, sideRailLowerMountPointToBottom - railBottomThick])
        mirror([0, 1, 0])
        rotate([90, 0, 0])
        front_box_holder(
            plateThickness = frontPlateThickness,
            cutoutOffsetX = (rackMountScrewWidth - (boxWidth - 2 * frontPlateCutoutXSpace)) / 2,
            cutoutOffsetY = railBottomThick + frontPlateCutoutYSpace,
            cutoutX = boxWidth - 2 * frontPlateCutoutXSpace,
            cutoutY = boxHeight - 2 * frontPlateCutoutYSpace,
            zOrientation = zOrientation,
            supportedZ = boxHeight,
            supportWidth = max(10, boxWidth - (sideRailBaseWidth + 10)),
            supportRailDefaultThickness = railDefaultThickness
        );
    }
}

// ============================================================================
// SIDE SUPPORT RAIL
// Based on rackstack-main sideRail.scad
// ============================================================================

module side_support_rail_base(
    top = true,
    recess = false,
    supportedZ,
    supportedY,
    supportedX,
    zOrientation = "middle",
    defaultThickness = 2,
    railSideThickness = 4,
    sideVent = true
) {
    mountBlockDepth = 10;
    screwMountGlobalDz = screwDiff / 2.0;
    sideRailScrewToMainRailFrontDx = frontScrewSpacing + railFrontThickness;

    railLength = max(sideRailScrewMountDist + sideRailScrewToMainRailFrontDx + mountBlockDepth / 2, supportedY + defaultThickness);
    railBaseThickness = defaultThickness;
    railBackThickness = 3;

    u = findU(supportedZ, railBaseThickness);
    railBottomThick = railBottomThickness(u, supportedZ, railBaseThickness, zOrientation);

    railSideHeight = supportedZ + railBaseThickness + railBottomThick + overhangSlack;
    frontMountPad = sideRailScrewToMainRailFrontDx - mountBlockDepth / 2;

    translate([-railSideThickness, 0, -railBottomThick])
    _apply_main_rail_mounts(u, railSideHeight, supportedX, railSideThickness, frontMountPad, mountBlockDepth)
    _side_rail_body(
        railLength, railBottomThick, railSideThickness, railSideHeight,
        railBaseThickness, railBackThickness, supportedY, top, sideVent,
        frontMountPad, mountBlockDepth
    );
}

// Apply mount blocks with hex nut pockets - TWO mount blocks (front and back)
module _apply_main_rail_mounts(u, railSideHeight, supportedX, railSideThickness, frontMountPad, mountBlockDepth) {
    mountBlockExtension = (railSupportsDx - supportedX) / 2 - railSideThickness;
    minHexNutPocketToXYDist = sideRailLowerMountPointToBottom;
    minHexNutPocketToXZDist = mountBlockDepth / 2;
    minHexNutPocketToYZDist = 4;
    screwU = floor(railSideHeight / uDiff) - 1;

    apply_pn() {
        // Positive: Two mount blocks
        _mount_blocks_positive(mountBlockExtension, frontMountPad, mountBlockDepth, railSideHeight);
        // Negative: Hex nut pockets
        _mount_blocks_negative(mountBlockExtension, frontMountPad, mountBlockDepth, minHexNutPocketToXYDist, minHexNutPocketToXZDist, minHexNutPocketToYZDist, railSideThickness, screwU);
        // Base: children
        children(0);
    }
}

// Two mount blocks - front and back
module _mount_blocks_positive(mountBlockExtension, frontMountPad, mountBlockDepth, railSideHeight) {
    // Front mount block
    translate([-mountBlockExtension, frontMountPad, 0])
    cube([mountBlockExtension, mountBlockDepth, railSideHeight]);

    // Back mount block
    translate([-mountBlockExtension, frontMountPad + sideRailScrewMountDist, 0])
    cube([mountBlockExtension, mountBlockDepth, railSideHeight]);
}

// Hex nut pockets for both mount blocks
module _mount_blocks_negative(mountBlockExtension, frontMountPad, mountBlockDepth, minHexNutPocketToXYDist, minHexNutPocketToXZDist, minHexNutPocketToYZDist, railSideThickness, screwU) {
    // Front mount block nut pockets
    translate([0, frontMountPad, 0])
    _single_mount_block_negative(mountBlockExtension, mountBlockDepth, minHexNutPocketToXYDist, minHexNutPocketToXZDist, minHexNutPocketToYZDist, railSideThickness, screwU);

    // Back mount block nut pockets
    translate([0, frontMountPad + sideRailScrewMountDist, 0])
    _single_mount_block_negative(mountBlockExtension, mountBlockDepth, minHexNutPocketToXYDist, minHexNutPocketToXZDist, minHexNutPocketToYZDist, railSideThickness, screwU);
}

module _single_mount_block_negative(mountBlockExtension, mountBlockDepth, minHexNutPocketToXYDist, minHexNutPocketToXZDist, minHexNutPocketToYZDist, railSideThickness, screwU) {
    backSpace = min((railSideThickness - 1) + mountBlockExtension - minHexNutPocketToYZDist, 15);

    // Lower nut pocket
    translate([-mountBlockExtension + minHexNutPocketToYZDist, minHexNutPocketToXZDist, minHexNutPocketToXYDist])
    rotate([0, -90, 0])
    hex_nut_pocket(screwType = rackFrameScrewType, openSide = false, backSpace = backSpace);

    // Upper nut pocket
    if (screwU > 0) {
        translate([-mountBlockExtension + minHexNutPocketToYZDist, minHexNutPocketToXZDist, minHexNutPocketToXYDist + uDiff * screwU])
        rotate([0, -90, 0])
        hex_nut_pocket(screwType = rackFrameScrewType, openSide = false, backSpace = backSpace);
    }
}

// Side rail body
module _side_rail_body(
    railLength, railBottomThick, railSideThickness, railSideHeight,
    railBaseThickness, railBackThickness, supportedY, top, sideVent,
    frontMountPad, mountBlockDepth
) {
    difference() {
        union() {
            // Bottom plate
            cube([sideRailBaseWidth, railLength, railBottomThick]);

            // Side wall
            cube([railSideThickness, railLength, railSideHeight]);

            // Back support
            translate([0, max(railLength - railBackThickness, supportedY), 0])
            cube([sideRailBaseWidth, railBackThickness, railSideHeight]);

            // Box back support
            translate([0, supportedY, 0])
            cube([sideRailBaseWidth, railBackThickness, railSideHeight]);

            // Top plate
            if (top) {
                translate([0, 0, railSideHeight - railBaseThickness])
                cube([sideRailBaseWidth, railLength, railBaseThickness]);
            }
        }

        // Ventilation
        if (sideVent) {
            _side_rail_ventilation(
                railSideThickness, railSideHeight, railBottomThick, railBaseThickness,
                frontMountPad, mountBlockDepth, supportedY, railLength
            );
        }
    }
}

// Ventilation cutouts with rounded corners - TWO vent areas
module _side_rail_ventilation(
    sideThickness, totalHeight, bottomThick, topThick,
    frontPad, mountDepth, supportedY, railLength
) {
    distFromEdge = 3;
    r = 4;

    // First vent area (between front mount and box back)
    ventDy1 = frontPad + mountDepth + distFromEdge;
    ventY1 = min(supportedY - (ventDy1 + distFromEdge), sideRailScrewMountDist - (2 * distFromEdge + mountDepth));

    // Second vent area (behind box back support)
    ventDy2 = max(ventDy1, supportedY + 3 + distFromEdge);  // 3 = railBackThickness
    ventY2 = max(0, railLength - (ventDy2 + distFromEdge + mountDepth));

    ventDz = bottomThick + distFromEdge + r;
    ventZ = totalHeight - (ventDz + distFromEdge + r + topThick);

    // First vent
    if (ventY1 > 2 * r && ventZ > 2 * r) {
        translate([-eps, ventDy1 + r, ventDz])
        minkowski() {
            cube([sideThickness + 2 * eps, ventY1 - 2 * r, ventZ]);
            sphere(r = r, $fn = 16);
        }
    }

    // Second vent
    if (ventY2 > 2 * r && ventZ > 2 * r) {
        translate([-eps, ventDy2 + r, ventDz])
        minkowski() {
            cube([sideThickness + 2 * eps, ventY2 - 2 * r, ventZ]);
            sphere(r = r, $fn = 16);
        }
    }
}

// ============================================================================
// FRONT BOX HOLDER
// ============================================================================

module front_box_holder(
    plateThickness = 3,
    cutoutOffsetX,
    cutoutOffsetY,
    cutoutX,
    cutoutY,
    supportedZ,
    supportWidth,
    supportDepth = 5,
    supportRailDefaultThickness,
    zOrientation = "middle"
) {
    u = findU(supportedZ, supportRailDefaultThickness);
    supportRailBottomThick = railBottomThickness(u, supportedZ, supportRailDefaultThickness, zOrientation);

    difference() {
        union() {
            // Base plate
            plate_base(
                U = u,
                plateThickness = plateThickness,
                screwType = mainRailScrewType,
                screwToXEdge = boxPlateScrewToXEdge,
                screwToYEdge = boxPlateScrewToYEdge,
                filletR = 2
            );

            // Bottom support ledge
            translate([(rackMountScrewWidth - supportWidth) / 2, -boxPlateScrewToYEdge, 0])
            cube([supportWidth, supportRailBottomThick, supportDepth]);

            // Top support ledge
            translate([(rackMountScrewWidth - supportWidth) / 2, -boxPlateScrewToYEdge + supportRailBottomThick + supportedZ, 0])
            cube([supportWidth, supportRailDefaultThickness, supportDepth]);
        }

        // Cutout with rounded corners
        translate([cutoutOffsetX, cutoutOffsetY - boxPlateScrewToYEdge, -inf / 2])
        minkowski() {
            cornerR = 2;
            cylinder(r = cornerR, h = inf, $fn = 32);
            translate([cornerR, cornerR, 0])
            cube([cutoutX - 2 * cornerR, cutoutY - 2 * cornerR, inf]);
        }
    }
}

// ============================================================================
// EXAMPLE
// ============================================================================

module enclosed_box_example() {
    // Assembled view
    enclosed_box_system(
        boxWidth = 159,
        boxHeight = 27.2,
        boxDepth = 101.5,
        visualize = true,
        splitForPrint = false
    );

    // Split for printing
    translate([0, 150, 0])
    enclosed_box_system(
        boxWidth = 159,
        boxHeight = 27.2,
        boxDepth = 101.5,
        visualize = false,
        splitForPrint = true
    );
}

// Uncomment to preview:
// enclosed_box_example();
