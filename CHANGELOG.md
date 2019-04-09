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
3. electron@4.1.4

#####fixed
1. auto fill now takes hex numbers. Decimal will be converted to hex, hex will still be hex.