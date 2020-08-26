git submodule update --init --recursive
call npm install -g cmake-js
call npm install -g yarn
call npm install
call cmake-js rebuild
call yarn dist