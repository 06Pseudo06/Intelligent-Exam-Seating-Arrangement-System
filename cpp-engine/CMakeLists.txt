cmake_minimum_required(VERSION 3.10)
project(ExamSeatingAllocator VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Optimization flags
if(MSVC)
    add_compile_options(/W4 /O2)
else()
    add_compile_options(-Wall -Wextra -O3)
endif()

# Engine sources
include_directories(include)
file(GLOB SOURCES "src/*.cpp")

# Executable output
add_executable(allocator ${SOURCES})

# Target installation
install(TARGETS allocator DESTINATION bin)
