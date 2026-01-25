/*
 * Rack Scad - Patch Panel Rack Mount Type
 * Linear array of keystone module slots with proper RJ45 measurements
 *
 * Based on rackstack-main keystone implementations with actual measured dimensions.
 */

include <common.scad>

// ============================================================================
// KEYSTONE MODULE DIMENSIONS (Measured from actual RJ45 keystones)
// ============================================================================

// Type 1 Keystone (slot-to-slot) - Main body dimensions
KEYSTONE_MAIN_BODY_WIDTH = 15.0;
KEYSTONE_MAIN_BODY_HEIGHT = 16.90;
KEYSTONE_MAIN_BODY_DEPTH = 32.90;

// Hook and lug dimensions
KEYSTONE_HEIGHT_WITH_HOOK_BODY = 20.2;
KEYSTONE_HEIGHT_WITH_HOOK_CATCH = 21.30;
KEYSTONE_WIDTH_WITH_SIDE_LUGS = 15.96;
KEYSTONE_SIDE_LUG_WIDTH = (KEYSTONE_WIDTH_WITH_SIDE_LUGS - KEYSTONE_MAIN_BODY_WIDTH) / 2.0;
KEYSTONE_HEIGHT_WITH_BOTTOM_LUG = 17.5;

// Position dimensions
KEYSTONE_FRONT_TO_HOOK_CATCH = 8.35;
KEYSTONE_FRONT_TO_BOTTOM_LUG_BACK = 8.23;
KEYSTONE_FRONT_TO_SIDE_LUG_FRONT = 10.63;

// Type 2 Keystone (panel mount) dimensions
KEYSTONE2_FRONT_WIDTH = 14.5;
KEYSTONE2_FRONT_HEIGHT = 16.2;
KEYSTONE2_FRONT_TO_REAR_DEPTH = 8.4;
KEYSTONE2_REAR_WIDTH = 14.5;
KEYSTONE2_REAR_HEIGHT = 19.55;
KEYSTONE2_REAR_PANEL_THICKNESS = 2 - supportedOverhangSlack;
KEYSTONE2_MAXIMUM_WIDTH = 14.5;
KEYSTONE2_MAXIMUM_HEIGHT = 22.15;
KEYSTONE2_LUG_HEIGHT = 1.3;

// Standard spacing
KEYSTONE_SPACING = 19;

// Slot types:
// 1 = Type 1 keystone (snap-in from front, original design)
// 2 = Type 2 keystone (cleaner look, keystone harder to remove)
// 3 = Blank plate (thin)
// 4 = Thick blank (5.9mm - matches keystone1 depth)
// 5 = Extra thick blank (matches keystone2 depth)

// ============================================================================
// MAIN PATCH PANEL MODULE
// ============================================================================

/*
 * Create a keystone patch panel
 *
 * Parameters:
 *   slots - Array of slot types [1, 2, 1, 3, ...] or just a count (defaults to type 2)
 *   u - Rack units (default 2U for standard panels)
 *   plateThickness - Base panel thickness
 *   screwToXEdge - Distance from screw to edge
 *   screwToYEdge - Distance from screw to edge
 *   keystoneSpacing - Spacing between keystones (default 19mm)
 *   centered - Center the keystone array horizontally
 */
module patch_panel(
    slots = [2, 2, 2, 2, 2, 2],
    u = 2,
    plateThickness = 3,
    screwToXEdge = 4.5,
    screwToYEdge = 4.5,
    keystoneSpacing = KEYSTONE_SPACING,
    centered = true
) {
    // Handle both array and count inputs
    slotArray = is_list(slots) ? slots : [for (i = [0:slots-1]) 2];
    slotCount = len(slotArray);

    slotsWidth = slotCount * keystoneSpacing;
    slotsMinPadding = railScrewHoleToInnerEdge + 4;

    plateLength = rackMountScrewWidth + 2 * screwToXEdge;
    plateHeight = u * screwDiff + 2 * screwToYEdge;

    leftRailScrewToSlots = centered
        ? (plateLength - slotsWidth) / 2
        : slotsMinPadding;

    // Calculate keystone slot height (centered in panel)
    slotOuterHeight = plateHeight - 2 * screwToYEdge;

    difference() {
        // Base plate with mounting holes
        plate_base(
            U = u,
            plateThickness = plateThickness,
            screwType = mainRailScrewType,
            screwToXEdge = screwToXEdge,
            screwToYEdge = screwToYEdge,
            filletR = 2
        );

        // Cut out the slot area
        translate([leftRailScrewToSlots, screwToYEdge, -eps])
        cube([slotsWidth, slotOuterHeight, plateThickness + 2 * eps]);
    }

    // Add keystone holders
    for (i = [0:slotCount - 1]) {
        slotType = slotArray[i];
        slotX = leftRailScrewToSlots + keystoneSpacing / 2 + i * keystoneSpacing;
        slotY = plateHeight / 2;

        translate([slotX, slotY, 0])
        _create_keystone_slot(slotType, keystoneSpacing, slotOuterHeight, plateThickness);
    }
}

/*
 * Internal: Create individual keystone slot based on type
 */
module _create_keystone_slot(slotType, outerWidth, outerHeight, plateThickness) {
    if (slotType == 1) {
        keystone_type1(outerWidth = outerWidth, outerHeight = outerHeight);
    } else if (slotType == 2) {
        keystone_type2(plateThickness = plateThickness, outerWidth = outerWidth, outerHeight = outerHeight);
    } else if (slotType == 3) {
        _blank_plate_slot(outerWidth, outerHeight, plateThickness);
    } else if (slotType == 4) {
        _blank_plate_slot(outerWidth, outerHeight, 5.9);
    } else if (slotType == 5) {
        _blank_plate_slot(outerWidth, outerHeight, KEYSTONE2_FRONT_TO_REAR_DEPTH + KEYSTONE2_REAR_PANEL_THICKNESS);
    }
}

// ============================================================================
// KEYSTONE TYPE 1 (Original snap-in design)
// Based on actual RJ45 keystone jack measurements
// ============================================================================

/*
 * Create negative volume for RJ45 keystone jack
 * This is the cutout shape that the keystone fits into
 */
module _rj45_keystone_negative() {
    // Main keystone body
    cube([KEYSTONE_MAIN_BODY_WIDTH + xySlack,
          KEYSTONE_MAIN_BODY_DEPTH + xySlack,
          KEYSTONE_MAIN_BODY_HEIGHT]);

    // Slot for top hook
    translate([0, KEYSTONE_FRONT_TO_HOOK_CATCH, 0])
    cube([KEYSTONE_MAIN_BODY_WIDTH + xySlack,
          KEYSTONE_MAIN_BODY_DEPTH - KEYSTONE_FRONT_TO_HOOK_CATCH + xySlack,
          KEYSTONE_HEIGHT_WITH_HOOK_BODY]);

    cube([KEYSTONE_MAIN_BODY_WIDTH + xySlack,
          KEYSTONE_FRONT_TO_HOOK_CATCH + xySlack,
          KEYSTONE_HEIGHT_WITH_HOOK_CATCH]);

    // Slots for side lugs
    translate([-KEYSTONE_SIDE_LUG_WIDTH, KEYSTONE_FRONT_TO_SIDE_LUG_FRONT, 0])
    cube([KEYSTONE_WIDTH_WITH_SIDE_LUGS + xySlack,
          KEYSTONE_MAIN_BODY_DEPTH - KEYSTONE_FRONT_TO_SIDE_LUG_FRONT + xySlack,
          KEYSTONE_MAIN_BODY_HEIGHT]);

    // Slots for bottom lugs
    translate([0, 0, -(KEYSTONE_HEIGHT_WITH_BOTTOM_LUG - KEYSTONE_MAIN_BODY_HEIGHT)])
    cube([KEYSTONE_MAIN_BODY_WIDTH + xySlack,
          KEYSTONE_FRONT_TO_BOTTOM_LUG_BACK + xySlack,
          KEYSTONE_MAIN_BODY_HEIGHT]);
}

/*
 * Create clipped keystone negative for front face
 */
module _rj45_keystone_jack_clipped() {
    translate([0, -4, 0.5])
    intersection() {
        translate([-2.5, 4, -4])
        cube([20, 6, 28]);
        _rj45_keystone_negative();
    }
}

/*
 * Create Type 1 keystone holder
 * Original design where keystone snaps in from front
 */
module keystone_type1(outerWidth, outerHeight) {
    slotDepth = 5.9;  // Standard keystone1 depth

    rotate([0, 0, 180])  // Match keystone2 direction
    difference() {
        // Outer holder body
        translate([0, 0, slotDepth / 2])
        cube([outerWidth, outerHeight, slotDepth], center = true);

        // Keystone cutout
        translate([-(KEYSTONE_MAIN_BODY_WIDTH + xySlack) / 2,
                   (KEYSTONE_HEIGHT_WITH_HOOK_CATCH + KEYSTONE_HEIGHT_WITH_BOTTOM_LUG - KEYSTONE_MAIN_BODY_HEIGHT) / 2,
                   0])
        rotate([90, 0, 0])
        _rj45_keystone_jack_clipped();
    }
}

// ============================================================================
// KEYSTONE TYPE 2 (Cleaner panel mount design)
// Keystone inserts from rear, cleaner front appearance
// ============================================================================

/*
 * Create Type 2 keystone holder
 * Cleaner look but keystone is slightly harder to remove
 */
module keystone_type2(plateThickness = 3, outerWidth, outerHeight) {
    totalDepth = KEYSTONE2_FRONT_TO_REAR_DEPTH + KEYSTONE2_REAR_PANEL_THICKNESS;

    difference() {
        // Outer body
        translate([-outerWidth / 2, -outerHeight / 2, 0])
        cube([outerWidth, outerHeight, totalDepth]);

        // Front panel hole (where you see the RJ45 port)
        translate([-(KEYSTONE2_FRONT_WIDTH + xySlack) / 2,
                   -(KEYSTONE2_FRONT_HEIGHT + xySlack) / 2,
                   -eps])
        cube([KEYSTONE2_FRONT_WIDTH + xySlack,
              KEYSTONE2_FRONT_HEIGHT + xySlack,
              plateThickness + eps]);

        // Middle cavity (where keystone body sits)
        translate([-(KEYSTONE2_MAXIMUM_WIDTH + xySlack) / 2,
                   -KEYSTONE2_FRONT_HEIGHT / 2 - KEYSTONE2_LUG_HEIGHT - xySlack / 2,
                   plateThickness])
        cube([KEYSTONE2_REAR_WIDTH + xySlack,
              outerHeight + 100,  // Extends beyond for lug clearance
              KEYSTONE2_FRONT_TO_REAR_DEPTH - plateThickness + eps]);

        // Rear panel hole (where cable connects)
        translate([-(KEYSTONE2_REAR_WIDTH + xySlack) / 2,
                   -(KEYSTONE2_FRONT_HEIGHT + xySlack) / 2,
                   KEYSTONE2_FRONT_TO_REAR_DEPTH])
        cube([KEYSTONE2_REAR_WIDTH + xySlack,
              KEYSTONE2_REAR_HEIGHT + xySlack,
              KEYSTONE2_REAR_PANEL_THICKNESS + eps]);
    }
}

// ============================================================================
// BLANK PLATE SLOT
// ============================================================================

module _blank_plate_slot(outerWidth, outerHeight, thickness) {
    translate([-outerWidth / 2, -outerHeight / 2, 0])
    cube([outerWidth, outerHeight, thickness]);
}

// ============================================================================
// LABELED PATCH PANEL (with label strip)
// ============================================================================

/*
 * Create a patch panel with a label strip above the ports
 */
module labeled_patch_panel(
    slots = [2, 2, 2, 2],
    labels = [],
    labelHeight = 8,
    u = 2,
    plateThickness = 3,
    keystoneSpacing = KEYSTONE_SPACING
) {
    slotCount = is_list(slots) ? len(slots) : slots;
    slotsWidth = slotCount * keystoneSpacing;
    plateLength = rackMountScrewWidth + 2 * 4.5;
    plateHeight = u * screwDiff + 2 * 4.5;
    leftOffset = (plateLength - slotsWidth) / 2;

    // Main panel
    patch_panel(
        slots = slots,
        u = u,
        plateThickness = plateThickness,
        keystoneSpacing = keystoneSpacing
    );

    // Label strip (raised white area for writing/labeling)
    color("White")
    translate([leftOffset, plateHeight - 4.5 - labelHeight, plateThickness])
    cube([slotsWidth, labelHeight, 0.6]);
}

// ============================================================================
// PATCH PANEL SYSTEM (matches rackstack entry point)
// ============================================================================

/*
 * Complete patch panel system matching rackstack-main interface
 */
module patch_panel_system(
    slots = [2, 2, 2, 2, 2, 2],
    plateThickness = 3,
    keystoneSpacing = 19,
    centered = true
) {
    mirror([0, 0, 1])
    patch_panel(
        slots = slots,
        u = 2,
        plateThickness = plateThickness,
        keystoneSpacing = keystoneSpacing,
        centered = centered
    );
}

// ============================================================================
// EXAMPLE
// ============================================================================

module patch_panel_example() {
    // 6-port panel with Type 2 keystones (cleaner look)
    color("SteelBlue")
    patch_panel(
        slots = [2, 2, 2, 2, 2, 2],
        u = 2,
        centered = true
    );

    // Mixed slot types
    color("Coral")
    translate([0, 120, 0])
    patch_panel(
        slots = [1, 2, 2, 3, 2, 1],  // Mix of Type1, Type2, and Blank
        u = 2
    );

    // 9-port panel with blank separator
    color("LightGreen")
    translate([0, 240, 0])
    patch_panel(
        slots = [2, 2, 2, 2, 5, 2, 2, 2, 2],  // 4 ports, thick blank, 4 ports
        u = 2
    );
}

// Uncomment to preview:
// patch_panel_example();
