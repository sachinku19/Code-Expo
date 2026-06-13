const fs=require("fs")
const path=require("path");

//execute file
const {exec}=require("child_process")

const runCpp=(code,input)=>{

    return new Promise((resolve,reject)=>{

        const cppFile = path.join(
            __dirname,
            "../temp/code.cpp"
        );
           
        const exeFile = path.join(
            __dirname,
            "../temp/code.exe"
        );

        const inputFile=path.join(__dirname,"../inputcpp.txt")

        fs.writeFileSync(cppFile,code);
        fs.writeFileSync(inputFile,input || "");

        


        exec(
            `g++ "${cppFile}" -o "${exeFile}"`,
            (compileError,stdout,stderr)=>{
            
                if(compileError){
                return reject(stderr || compileError.message);
            }
             exec(
                   `"${exeFile}"<"${inputFile}`,
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
    })
}

module.exports={
    runCpp
}