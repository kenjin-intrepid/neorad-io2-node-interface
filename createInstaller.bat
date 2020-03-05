git submodule update --init --recursive
call npm update -g cmake-js
call npm update -g yarn
call npm install
call cmake-js rebuild
call yarn add electron-builder --dev
call yarn dist