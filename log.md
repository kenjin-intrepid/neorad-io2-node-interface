## Update of current functions
###

##### 4-12

1. removed node_module from git.

2. save function should now work with updated main.cpp

3. moving on to fix charts display

##### 4-13

1. test if repo works on other machines as intended

2. updated main.cpp data structure of device data that will be pulled for display

3. changed how echarts get data

4. still working on charts, should be working by end of monday

5. need to work on how data is organized once line graph reaches 200,000 points(using canvas not svg), open for ideas.

##### 4-16

1. data structure completely redesigned for echarts. Still working on it to get it visualized as this needs some tweaking with it's api

2. since visualization of echart syncs every x second and not x or y or z second(only a single value is allowed),working on a way around this. I'm thinking of getting data pushed to an array first with different time frames, and visualize the array every x second.

3. visualization will be the main challenge here, considering rewriting everything using canvas without using libraries but this takes much more time.

##### 4-17

1. Echart visualization of data and data export is now done.

2. Export data will be different from visual data, export data is raw data from called from c, visual data is reformatted for better visual performance.

3. Will revisit and tweak visual data once this app is all completed. 

##### 4-18

1. color scheme change

2. layout change

3. remove all popup windows for now. (I'm currently using native electron popup and not browser popup)

4. working on chart sampling for data

##### 4-19

1. moved get time from js to native for better performance and more precision

2. add selection for which device to be visualized

##### 4-20

1. tested overnight one echart will not hang with one device per chart

2. considering changing the export tab layout, currently lists the data in table style, which takes very long time to render when data size is large, 22minutes for 74k rows

3. added selection for chart visualization, default is the first device

##### 4-23

1. added button click animation feed back

2. added sidebar in Graph for better UI

3. will be adding section in sidebar for all channel data

##### 4-24

1. updated button click animation

##### 4-30

1. compiling native code with node-gyp by default

2. to use cmake-js package.json and renderer.js needs change

    1. package.json need to delete line 8 and line 31
    
    2. renderer.js needs to comment out line 26 & 27, uncomment line 29 & 30
    
3. CMD for node-gyp to rebuild and reconfigure

        node-gyp configure rebuild
        
4. CMD for cmake-js

        cmake-js reconfigure
        
        cmake-js rebuild

5. Check native code in chrome console

    1. for node-gyp build
    
            Addon.Native();
            
    2. for cmake-js build
    
            NodeCmake.Native();


#### please note both both cmake-js and node-gyp needs a global install with npm -i -g ${library_name}

##### 5-3

1. updated electron to 2.0.0

2. running native module without electron to test still not binding

        node -e "require('./build/Release/neoRAD_IO2.node')"

3. Ref

        https://electronjs.org/docs/development/build-system-overview#tests

        https://electronjs.org/docs/development/debugging-instructions-macos

##### 5-10

1. using cmake-js to compile C to node from now on. (Only slight change to cmakelist instead of rewriting cmakelist to gyp file)

2. added windows specifics so module can be compiled.

3. using extern "C" to include C header files (won't work without this)

4. need to change clock_gettime(CLOCK_MONOTONIC) to std::chrono::steady_clock for cross platform

5. cmake-js updated to 3.7.1 from 3.6.2, please run 

        npm update
        
##### 5-28

1. added steaming-worker to project

##### 6-12

1. got read and write settings to device working.

2. updated UI

3. rewrote most of the code in js for reading settings

4. need to work on set settings for each individual chip

5. data visualization in graph is missing at the moment.

##### 6-19

1. charts now working.

2. can set settings for each chip. 

3. pause now working.

4. build release for mac.

##### 6-21

1. fixed problem with buttom spamming

2. changed ui layout accordingly 

3. fixed visual ui issue with multi channel logging after log started.

4. fixed issue with still having temperature data when changing channel status after log started.

5. fixed when device is not connected, spamming the find device button will crash app

6. fixed when device unplugged after find device, app will not disconnect.

##### 6-26

1. fixed to work with new firmware

2. can see multiple devices now.

##### 7-2

1. fixed temperature issue with multiple TC devices

2. new branch with graph using ploty

##### 7-3 

1. abandoning ploty due to performance issues, and a unfixed bug that throws error while data is updated during selection

##### 7-4

1. changed license to MIT

2. updated echart channel selection

##### 7-6

1. added progress bar for chart logging indication

2. switch to main tab when device disconnected while in export or graph tab

3. prevent graph from starting when there is no data

4. electron version 2.0.4

##### 7-11

1. updated UI to better fit low resolution screens

2. fixed device default settings button to work for each device not all devices

3. added tag name DOM for future use

4. added temp live update in graph legends

5. removed show data table in export and simplified export tab

6. when tag name changes with a valid value, chart legend will be updated

##### 7-13

1. added a filter for graph data.

##### 7-17

1. added auto data export function. Data is not auto written to harddisk every 100 data sets.

2. removed export function

3. updated graph UI

##### 7-18

1. changed to every 500 data sets write to file.

2. changed naming scheme for filename.

##### 7-24

1. when click save, tag name will be saved to local storage so next time user connects the tag name will still be there(temp solution)

2. added locale templates(currently only english, chinese and japanese)

3. fixed a bug on mac, auto export will fail because of write permission

##### 7-25

1. added setting tab modal for changing locale

2. completed most locale translations for chinese and japanese

##### 7-26

1. changed color scheme in graph for more pro look.

2. added ico and icns to installer

3. added windows state library to store user window position and size for better UX

##### 7-27

1. added native menu

##### 8-1

1. made a build for ubuntu.

2. ubuntu version can't connect to device, will not return data.

##### 8-6

1. added temperature unit in settings.

2. prevent user text highlight

##### 8-9

1. data now exports to a folder instead of root download folder

2. added graph refresh rate(note: graph refresh rate doesn't affect the actual data logged to csv file)
the data exported to csv depends on the refresh rate of each bank. the graph refreshes much slower due to preventing the DOM from crashing on slower machines.

3. changed naming scheme for TC, AIN and AOUT to bank from channel.

##### 8-10

1. export csv changed to contain only one header.

2. added locale for refresh rate in settings.

3. changed fonts used by app

##### 8-14

1. added electron-settings, replacing localStorage because main.js can't access data stored inside the renderer process

2. added locale for top level menu(this is loaded before rendering and is separate from the contents locale file)

3. added help locale

##### 8-23

1. updated program for new C library

2. changed export directory to Home

##### 9-1

1. changed to plotly for charts

2. updated program, works with multi devices

##### 9-11

1. added calibration view.

2. arrow function in calibration chart.

3. add, reorder and remove function in calibration chart.

4. save settings to JSON file in calibration.

##### 9-12

1. added locale for calibration

##### 9-21

1. Updated graph with plot views for each period of time to improve performance without losing data.

2. All plot view data is stored locally.

##### 9-30

1. Added history plot

##### 12-11

1. clean up C++ code

2. improved calibration UI

3. updated locale templates
