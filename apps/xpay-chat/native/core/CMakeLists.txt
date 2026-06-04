cmake_minimum_required(VERSION 3.22.1)
project(xpaychat_core LANGUAGES CXX)

add_library(xpaychat_core STATIC src/xpaychat_core.cpp)
target_include_directories(xpaychat_core PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/include)
target_compile_features(xpaychat_core PUBLIC cxx_std_17)
