const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const runJava = (code,input) => {

    return new Promise((resolve, reject) => {

        const javaFile = path.join(
            __dirname,
            "../temp/Main.java"
        );

        const inputFile=path.join(
            __dirname,
            "../temp/inputjava.txt"
        )

        fs.writeFileSync(javaFile,code );
        fs.writeFileSync(inputFile,input || "");

        exec(
            `javac "${javaFile}"`,
            (compileError, stdout, stderr) => {

                if (compileError) {
                    return reject(
                        stderr || compileError.message
                    );
                }

                exec(
                    `java -cp "${path.join(__dirname, "../temp")}" Main<"${inputFile}"`,
                    (runError, runStdout, runStderr) => {

                        if (runError) {
                            return reject(
                                runStderr ||
                                runError.message
                            );
                        }

                        resolve(runStdout);
                    }
                );
            }
        );
    });
};

module.exports = {
    runJava
};