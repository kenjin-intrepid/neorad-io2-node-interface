## Things you need 
###

1. Xcode command line tools for mac

    or

    MSVC build tools for PC

2. nodejs & npm

3. yarn

## To build
###

1. first install all node modules.

        npm install

2. use yarn to download electron-builder

        yarn add electron-builder --dev
        
3. add code signing to /electron-builder.env

    "CSC_LINK=" The HTTPS link (or base64-encoded data, or file:// link, or local path) to certificate (*.p12 or *.pfx file). Shorthand ~/ is supported (home directory).

    "#CSC_KEY_PASSWORD=" The password to decrypt the certificate given in CSC_LINK. (if applies)
    
4. use yarn to build installer
        
        yarn dist
        
        
## Build node module for mac
* the included .node file under /build/release is for PC

1. install Xcode CLI tools

2. npm install

3. run cmake-js

        cmake-js rebuild
        
4. copy the icon.icns file under /lib/img/ to /build/release
    this is the icon file
    
5. do the steps under To Build.