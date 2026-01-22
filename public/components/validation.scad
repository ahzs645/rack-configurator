/*
 * CageMaker PRCG - Validation Module
 * Modular Component: Safety checks, warnings, and visual alerts
 *
 * Based on CageMaker PRCG v0.21 by WebMaka
 * Original: https://github.com/WebMaka/CageMakerPRCG
 * License: CC BY-NC-SA 4.0
 */

use <utilities.scad>

// EIA unit height constant
_EIA_UNIT = 44.45;
_INCH_MM = 25.4;

/*
 * Display a visual warning indicator below the model
 * Shows a red triangle with exclamation mark and "CHECK CONSOLE!" text
 *
 * Parameters:
 *   units_required - Height of the cage in rack units (for positioning)
 */
module check_console_warning(units_required)
{
    // Warning triangle
    translate([0, 0 - ((units_required * _EIA_UNIT) / 2) - 100, 3])
        color("red")
            linear_extrude(height=4, center=true)
                polygon(points=[[-40,0],[0, 80],[40,0],[-30,6],[0,70],[30,6]], paths=[[0,1,2],[3,4,5]]);

    // Exclamation mark
    translate([-6, 0 - ((units_required * _EIA_UNIT) / 2) - 68, 3])
        color("red")
            linear_extrude(height=1, center=true)
                text("!", halign="left", valign="center", size=35);

    // "CHECK CONSOLE!" text
    translate([0, 0 - ((units_required * _EIA_UNIT) / 2) - 125, 3])
        color("red")
            linear_extrude(height=1, center=true)
                text("CHECK CONSOLE!", halign="center", size=20);

    // Background plate
    translate([0, 0 - ((units_required * _EIA_UNIT) / 2) - 74, 2])
        color("mistyrose")
            four_rounded_corner_plate(120, 260, 1, 5);
}

/*
 * Calculate required rack width based on device dimensions
 * Auto-scales to larger rack width if device doesn't fit
 *
 * Parameters:
 *   selected_width - User-selected rack width in inches
 *   device_width - Device width in mm
 *   heavy_device - 0=standard, 1=thick, 2=super-thick
 *
 * Returns: Required rack width in inches
 */
function calculate_required_rack_width(selected_width, device_width, heavy_device) =
    let(
        total_width = device_width + 16 + (heavy_device * 2)
    )
    selected_width +
    // Half-width 10" rack scaling
    (((selected_width == 5) && (total_width > 93) && (total_width <= 220)) ? 5 : 0) +
    // 6" micro-rack scaling
    (((selected_width == 6) && (total_width > 120) && (total_width <= 220)) ? 4 : 0) +
    (((selected_width == 6) && (total_width > 220)) ? 13 : 0) +
    // Third-width 19" rack scaling
    (((selected_width == 6.33) && (total_width > 130) && (total_width <= 220)) ? 3.17 : 0) +
    (((selected_width == 6.33) && (total_width > 220)) ? 12.67 : 0) +
    (((selected_width == 6.33001) && (total_width > 130) && (total_width <= 220)) ? 3.16999 : 0) +
    (((selected_width == 6.33001) && (total_width > 220)) ? 12.66669 : 0) +
    // 7" micro-rack scaling
    (((selected_width == 7) && (total_width > 145) && (total_width < 220)) ? 3 : 0) +
    (((selected_width == 7) && (total_width > 220)) ? 12 : 0) +
    // Half-width 19" rack scaling
    (((selected_width == 9.5) && (total_width > 210)) ? 9.5 : 0) +
    // Full 10" rack scaling
    (((selected_width == 10) && (total_width > 220)) ? 9 : 0) +
    // Full 19" rack (can't scale larger)
    (((selected_width == 19) && (total_width > 430)) ? -9 : 0);

/*
 * Calculate required rack units based on device height
 *
 * Parameters:
 *   device_height - Device height in mm
 *   heavy_device - 0=standard, 1=thick, 2=super-thick
 *   allow_half_heights - Whether to allow half-unit heights
 *
 * Returns: Required rack units
 */
function calculate_required_units(device_height, heavy_device, allow_half_heights) =
    let(
        total_height = device_height + 16 + (heavy_device * 2),
        multiplier = allow_half_heights ? 2 : 1
    )
    (ceil(total_height * multiplier / _EIA_UNIT)) / multiplier;

/*
 * Calculate working width boundaries for cage positioning
 *
 * Parameters:
 *   rack_width - Rack width in inches
 *   ear_type - "None", "One Side", or "Both Sides"
 *
 * Returns: [positive_boundary, negative_boundary]
 */
function calculate_working_bounds(rack_width, ear_type) =
    let(
        half_width = (rack_width * _INCH_MM) / 2,
        right_margin = (ear_type == "None") ? 15.875 : 12,
        left_margin = (ear_type == "Both Sides") ? 12 : 15.875
    )
    [half_width - right_margin, -(half_width - left_margin)];

/*
 * Validate horizontal cage offset
 * Returns safe offset (0 if invalid)
 *
 * Parameters:
 *   offset - Requested offset
 *   cage_width - Total cage width
 *   bounds - [positive_bound, negative_bound] from calculate_working_bounds
 */
function validate_horizontal_offset(offset, cage_width, bounds) =
    let(
        outer_edge = cage_width / 2,
        exceeds_positive = (offset > 0) && (outer_edge + offset > bounds[0]),
        exceeds_negative = (offset < 0) && (-outer_edge + offset < bounds[1])
    )
    (exceeds_positive || exceeds_negative) ? 0 : offset;

/*
 * Validate vertical cage offset
 * Returns safe offset (0 if invalid)
 *
 * Parameters:
 *   offset - Requested offset
 *   cage_height - Total cage height requirement
 *   units_required - Required rack units
 */
function validate_vertical_offset(offset, cage_height, units_required) =
    let(
        outer_edge = (units_required * _EIA_UNIT) / 2,
        exceeds_positive = (offset >= 0) && ((cage_height / 2) + offset > outer_edge),
        exceeds_negative = (offset < 0) && (-(cage_height / 2) + offset < -outer_edge)
    )
    (exceeds_positive || exceeds_negative) ? 0 : offset;

/*
 * Validate modification offset
 * Returns safe offset (0 if invalid, or auto-calculated position)
 *
 * Parameters:
 *   offset - Requested offset (0 = auto-position)
 *   mod_width - Width of the modification
 *   cage_outer_edge - Outer edge of cage
 *   cage_offset - Cage horizontal offset
 *   bounds - Working bounds from calculate_working_bounds
 *   slack_a - Slack space on positive side
 *   slack_b - Slack space on negative side
 */
function validate_mod_offset(offset, mod_width, cage_outer_edge, cage_offset, bounds, slack_a, slack_b) =
    // Auto-position if offset is 0
    (offset == 0 && slack_a > mod_width && slack_a >= abs(slack_b) &&
     cage_outer_edge + cage_offset + (slack_a / 2) + (mod_width / 2) < bounds[0])
        ? round(cage_outer_edge + cage_offset + (slack_a / 2))
    : (offset == 0 && abs(slack_b) > mod_width && slack_a < abs(slack_b) &&
       -cage_outer_edge + cage_offset + (slack_b / 2) - (mod_width / 2) > bounds[1])
        ? round(-cage_outer_edge + cage_offset + (slack_b / 2))
    // Validate manual offset
    : ((offset > 0 && offset + (mod_width / 2) > bounds[0]) ||
       (offset < 0 && offset - (mod_width / 2) < bounds[1]) ||
       (offset > 0 && offset - (mod_width / 2) < cage_outer_edge + cage_offset) ||
       (offset < 0 && offset + (mod_width / 2) > -cage_outer_edge + cage_offset))
        ? 0
    : offset;

/*
 * Echo warning messages to console
 *
 * Parameters:
 *   warning_type - Type of warning to display
 */
module echo_warning(warning_type)
{
    echo();
    echo();
    echo(" * * * WARNING! * * *");

    if (warning_type == "rack_width")
    {
        echo(" Device dimensions are too large to fit the selected rack width.");
        echo(" Width has been increased. Double-check your settings.");
    }
    else if (warning_type == "horizontal_offset")
    {
        echo(" Cage HORIZONTAL offset exceeds safe distance.");
        echo(" Offset has been forced to zero. Double-check your settings.");
    }
    else if (warning_type == "vertical_offset")
    {
        echo(" Cage VERTICAL offset exceeds safe distance.");
        echo(" Offset has been forced to zero. Double-check your settings.");
    }
    else if (warning_type == "mod_one_offset")
    {
        echo(" Mod one's offset exceeds safe distance.");
        echo(" Mod one has been disabled. Double-check your settings.");
    }
    else if (warning_type == "mod_one_height")
    {
        echo(" Mod one's size exceeds the cage's height and won't fit.");
        echo(" Mod one has been disabled.");
    }
    else if (warning_type == "mod_two_offset")
    {
        echo(" Mod two's offset exceeds safe distance.");
        echo(" Mod two has been disabled. Double-check your settings.");
    }
    else if (warning_type == "mod_two_height")
    {
        echo(" Mod two's size exceeds the cage's height and won't fit.");
        echo(" Mod two has been disabled.");
    }

    echo();
    echo();
}
