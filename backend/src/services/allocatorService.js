const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

/**
 * Resolves the path to the C++ allocator executable across Windows, Linux, and Docker.
 */
const resolveAllocatorExecutable = () => {
    // 1. Explicit environment override
    if (process.env.CPP_ALLOCATOR_BIN && fs.existsSync(process.env.CPP_ALLOCATOR_BIN)) {
        return process.env.CPP_ALLOCATOR_BIN;
    }

    const engineDir = path.join(__dirname, "..", "..", "..", "cpp-engine");
    
    // Candidates based on platform
    const isWindows = process.platform === "win32";
    const primaryCandidate = isWindows ? "allocator.exe" : "allocator";
    const secondaryCandidate = isWindows ? "allocator" : "allocator.exe";

    const primaryPath = path.join(engineDir, primaryCandidate);
    if (fs.existsSync(primaryPath)) {
        return primaryPath;
    }

    const secondaryPath = path.join(engineDir, secondaryCandidate);
    if (fs.existsSync(secondaryPath)) {
        return secondaryPath;
    }

    // Check bin/ directory if built via CMake or build scripts
    const binPrimary = path.join(engineDir, "bin", primaryCandidate);
    if (fs.existsSync(binPrimary)) {
        return binPrimary;
    }

    return primaryPath; // Return standard candidate for error message
};

/**
 * Executes the compiled C++ allocation engine with given arguments and timeout safety.
 */
const runAllocator = (inputPath, outputPath, strategy = "Snake", timeoutMs = 15000) => {
    return new Promise((resolve, reject) => {
        const exePath = resolveAllocatorExecutable();

        if (!fs.existsSync(exePath)) {
            return reject(
                new Error(
                    `Allocator binary not found at: ${exePath}. Please ensure the C++ engine has been compiled for your environment.`
                )
            );
        }

        if (!fs.existsSync(inputPath)) {
            return reject(new Error(`Input JSON file does not exist at: ${inputPath}`));
        }

        const allocatorProcess = spawn(exePath, [inputPath, outputPath, strategy]);

        let stdoutData = "";
        let stderrData = "";
        let isTimedOut = false;

        const timer = setTimeout(() => {
            isTimedOut = true;
            try {
                allocatorProcess.kill("SIGKILL");
            } catch (kErr) {
                // ignore
            }
            reject(new Error(`Allocator process timed out after ${timeoutMs}ms.`));
        }, timeoutMs);

        allocatorProcess.stdout.on("data", (data) => {
            stdoutData += data.toString();
        });

        allocatorProcess.stderr.on("data", (data) => {
            stderrData += data.toString();
        });

        allocatorProcess.on("close", (code) => {
            clearTimeout(timer);
            if (isTimedOut) return;

            if (code === 0) {
                if (!fs.existsSync(outputPath)) {
                    return reject(new Error("Allocator completed with code 0 but output JSON file was not created."));
                }
                resolve({
                    success: true,
                    outputPath,
                    stdout: stdoutData
                });
            } else {
                const details = stderrData.trim() || stdoutData.trim() || `Exit code ${code}`;
                reject(new Error(`Allocator execution failed with exit code ${code}. Details: ${details}`));
            }
        });

        allocatorProcess.on("error", (err) => {
            clearTimeout(timer);
            if (isTimedOut) return;
            reject(new Error(`Failed to spawn allocator process: ${err.message}`));
        });
    });
};

module.exports = {
    runAllocator,
    resolveAllocatorExecutable
};