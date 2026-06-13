const fs = require("fs");

const path = require("path");

const { exec } = require("child_process");


// Execute JS Code
const runjavascript = (code,input) => {

    return new Promise((resolve, reject) => {

        // Temp File Path
        const filePath = path.join(
            __dirname,
            "../temp/code.js"
        );

        //create file for input
        const inputPath=path.join(
            __dirname,
            "../temp/input.txt"
        );

        // Write Code Into File
        fs.writeFileSync(filePath, code);
        fs.writeFileSync(inputPath, input || "");
        // Execute File
        exec(`node "${filePath}" < "${inputPath}"`, (error, stdout, stderr) => {

            // Runtime Error
            if (error) {
                return reject(stderr || error);
            }

            // Success Output
            resolve(stdout);

        });

    });
};

module.exports = {
    runjavascript,
};