git submodule update --init --recursive
call npm install
call cmake-js rebuild
call yarn add electron-builder --dev
call yarn dist