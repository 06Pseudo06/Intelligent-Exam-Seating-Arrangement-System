#include <iostream>

void runValidationTests();
void runBalancerTests();

int main()
{
    std::cout << "========================================" << std::endl;
    std::cout << "   C++ Engine Native Unit Test Suite    " << std::endl;
    std::cout << "========================================" << std::endl;

    try
    {
        runValidationTests();
        runBalancerTests();

        std::cout << "\n[PASS] All C++ Native Unit Tests Passed Successfully!" << std::endl;
        return 0;
    }
    catch (const std::exception& e)
    {
        std::cerr << "\n[FAIL] Test threw exception: " << e.what() << std::endl;
        return 1;
    }
    catch (...)
    {
        std::cerr << "\n[FAIL] Test failed with unknown exception." << std::endl;
        return 1;
    }
}
