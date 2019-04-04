cmake_minimum_required(VERSION 3.10)
project(neoRAD_IO2)

set(CMAKE_CXX_STANDARD 11)
set(CMAKE_C_STANDARD 11)

if(UNIX AND NOT APPLE)
    set(HIDAPI_DIR ${PROJECT_SOURCE_DIR}/neoRAD-IO2-C-Library/libs/hidapi/linux)
    set(CMAKE_POSITION_INDEPENDENT_CODE ON)
    link_libraries("-ludev")
endif()

file(GLOB SOURCE_FILES "main.cpp")
if(MSVC)
        set(node_host_binary node)
        set(WIN_DELAY_LOAD_HOOK "lib/win_delay_load_hook.cc")
        add_compile_definitions(HOST_BINARY=\"${node_host_binary}${CMAKE_EXECUTABLE_SUFFIX}\")
        add_library(${PROJECT_NAME} SHARED ${SOURCE_FILES} ${WIN_DELAY_LOAD_HOOK})
        set_target_properties(${PROJECT_NAME} PROPERTIES LINK_FLAGS "/DELAYLOAD:${node_host_binary}${CMAKE_EXECUTABLE_SUFFIX}")
else()
        add_library(${PROJECT_NAME} SHARED ${SOURCE_FILES})
endif()
add_subdirectory(neoRAD-IO2-C-Library)

set_target_properties(${PROJECT_NAME} PROPERTIES PREFIX "" SUFFIX ".node")

target_include_directories(${PROJECT_NAME} PRIVATE ${CMAKE_JS_INC} ${HIDAPI_DIR})

target_link_libraries(${PROJECT_NAME} PUBLIC neoRADIO2 ${CMAKE_JS_LIB})
