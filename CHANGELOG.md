###v1.4.4

#####changed

1. Updated electron to 4.0
2. Calibration JSON file is now human readable
3. Store and read for Calibration will now read and store the entire range table
4. Changed some text in Calibration table
5. Moved edit button in Calibration table to the top
6. Default button in Devices tab will now also remove tag name
7. Changed unit to V for AIN in Calibration

#####fixed

1. Will no longer show "sensor not connected" when out of range for AIN
2. Fixed tag name not displaying correctly on windows
3. Fixed when device goes online button disable and enable logic in calibration table

#####added

1. Added the option for user, whether or not to auto save data to disk.
2. Export and Import for Calibration table.
3. Added clear button in Calibration mode, this will clear all Calibration data

###v1.4.5

#####changed

1. Changed font sizes to better adjust for smaller screens.

###v1.4.6

#####changed

1. Adjusted font-size and button sizes to fit better on lower resolutions.

#####fixed

1. Group select now works with enable and range select.

###v1.4.7

#####changed

1. Installer no longer in OneClick mode, user can now change where to install.
2. Bank header text is reverted back to align left.
3. Changed font of all user input boxes to mono space font.

#####fixed

1. Fixed issues with Power Relay on off switch lagging and sometimes not working.
2. Fixed issuer where can settings not reading correctly for each bank.

###v1.4.8

#####changed

1. default button now works with CAN tab, it will only change values to default according to the user view
2. Changed data we display for the AIN to 3 digits after decimal point for low, and 4 digits after decimal point for high, this represents the 16bit data we have for AIN.
3. Changed CAN settings layout for Power Relay and AOUT.
4. Using Hex for CAN ID input
5. electron@v4.0.6

#####fixed

1. Fixed an issue when user pauses after going online and can settings won't enable correctly.

#####added

1. Add options to auto fill dor CAN messages. 1 bank per message, 2 banks per message and whole device.
2. Added auto dump for data to the same file every time program opens.

###v1.4.9

#####fixed

1. Fixed auto save file not truncated when program restarts, causing files getting too big.
2. Fixed a display problem when AIN in low range, and values are out of range.

###v1.4.10

#####changed

1. Updated electron to 4.0.8(fixed fileReader security issue found in chrome)
2. Organized folder structure

###v1.4.11

#####changed
1. Updated electron@4.1.3，nan@2.13.2, electron-builder@20.39.0, ploty@1.45.3
2. Updated locale
3. Updated C++ catch exception in functions.h
4. Added dark theme
5. Interactive Calibration will store after user change mode back to Manual

#####fixed
1. Fixed missing icon for powerrly

###v1.4.12

#####changed
1. Changed some element colors in dark theme
2. Changed calibration buttons to slide buttons to make it clear
3. Reverted auto save in interactive calibration. Only user input would cal data be saved. Store would now work in Interactive mode.
4. Changed how auto fill works. 

###v1.4.13

#####changed
1. CAN type will be determined by the settings of the first bank if available
2. Using upper case for hex values in CAN settings.
3. Electron@4.1.4

#####fixed
1. Auto fill now takes hex numbers. Decimal will be converted to hex, hex will still be hex.

###v1.4.14 & v1.4.14a

#####changed
1. Added progress status when saving device settings.
2. Improved performance for pwrrly status change when device online.
3. Improved UI for dark theme when multiple device displayed.
4. Increased performance for more than 1 device connected.
5. jQuery@3.4.0, electron-builder@20.40.2

#####fixed
1. Fixed pwrrly not working when in chain as secondary device.
2. Fixed incorrect text description in settings and locale.

###v1.4.15

#####changed
1. Minor performance updates.
2. C++ code clean up.
3. Changed status text so it makes more sense.

#####fixed
1. Fixed text style issue when no sensor connected.
2. Fixed Function logic when in interactive calibration mode. Preventing possible program crash.

#####added
1. Added AOUT functionality (Needs to be tested at HQ)

###v1.4.16
#####changed
1. Electron@v4.1.5
2. Updated cmakelist, this will now require at least cmake-js@5.2 to build properly(Solves electron 4 delay hook without manually including cc file)

#####fixed
1. fixed an issue with locale settings preventing program to start properly.

###v1.4.17
#####changed
1. Electron@v4.2.0
2. Changed project name to RAD-io2
3. Removed crash report upload for main.js to prevent first run crash.

###v1.5.0
#####changed
1. Electron@v5.0.1

###v1.5.1
#####changed
1. Electron@v5.0.3
2. Electron-builder@v20.43.0

####fixed
1. Fixed an issue where wrong helper text is displayed for AIN.

###v1.5.2
#####changed
1. Electron@v5.0.4
2. Updated submodule library to work with calibration

#####added
1. Read calibration data for AOUT

###v1.5.3
#####changed
1. Electron@v5.0.6
2. Remove unnecessary code from C++ file.
3. Changed project name back to neoRAD-IO2(revert from 1.4.17)
4. Changed how tooltip text is shown.

#####added
1. Added error messages.
2. Added retry for initial find device.
3. Added support for ubuntu.
4. Added dev and production env detection to open console window.
5. Added warning for uninitialized devices.

#####fixed
1. Fixed folders won't create properly during initial run.
2. Fixed a display glitch with TC.

###v1.5.4
#####changed
1. Removed crash report uploading for Release.

#####added
1. CAN settings can now be exported to dbc file for TC, AIN, AOUT, PWRRLY.

#####fixed
1. Fixed can settings overlapping address not properly detected

###v1.5.5
#####added
1. Hardware version under info.

#####fixed
1. AOUT calibration read and write.
2. tool tip:Sensor not connected for TC.

###v1.6.0
#####changed
1. Electron@6.0.3

#####added
2. Support for multiple USB connections.

#####fixed
1. Calibration Import from json not working.

###v1.6.1
#####changed
1. how data is polled
2. Tooltip text position

###v1.6.2
#####changed
1. Changed delays in cpp

#####fixed
1. Default settings fixed
2. Fixed not reloading settings correctly

###v1.6.3
#####changed
1. Removed unnecessary modules
2. Changed CAN settings layout
3. UI updates

#####fixed
1. Fixed reload function for AIN

###v1.6.4
#####changed
1. Calibration can't be accessed during data reading.

#####fixed
1. Fixed CAN settings validation.
2. Fixed Cal table export and import.
3. Exported DBC files can now be properly loaded in Vspy.

#####added
1. Added warning to warn user of data override when using auto fill for can settings.
2. Added warning for default button.
3. Added warning for clear calibration button.

###v1.6.5
#####changed
1. Disabled tagname for power relay bank 2-8
2. Removed group select for power relay.
3. Removed auto fill for power relay.
4. Changed Init state for power relay to the correct values

###v1.6.6
#####changed
1. Updated C library to resolve serial number issue.
2. TC resolution to 1 digit after the decimal.

###v1.6.7
1. merged changes from 1.6.5 and 1.6.6
2. fixed issue with power_relay not displaying init state correctly.

###v1.6.8
1. Changed DBC export naming.
2. Electron@6.0.12

###v1.6.9
1. Updated company logo to the latest.
2. Fixed aout not reporting the correct values.