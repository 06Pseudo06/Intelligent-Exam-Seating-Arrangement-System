CXX = g++
CXXFLAGS = -std=c++17 -O3 -Wall -Wextra -Iinclude
SRCS = $(wildcard src/*.cpp)
TARGET = allocator

ifeq ($(OS),Windows_NT)
    TARGET := allocator.exe
endif

all: $(TARGET)

$(TARGET): $(SRCS)
	$(CXX) $(CXXFLAGS) $(SRCS) -o $(TARGET)

clean:
	rm -f $(TARGET) allocator.exe allocator

.PHONY: all clean
