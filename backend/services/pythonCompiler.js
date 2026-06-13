//for file read
const fs=require("fs");
const path=require("path");

//for execution
const {exec}=require("child_process")

const runPython=(code,input)=>{
  
    return new Promise((resolve,reject)=>{

        const filePath=path.join(
            __dirname,
            "../temp/code.py"
        );
        const inputPath = path.join(
    __dirname,
    "../temp/input.txt"
);

        fs.writeFileSync(filePath,code);
        fs.writeFileSync(inputPath,input || "");

        exec(`python "${filePath}" < "${inputPath}"`,(error,stdout,stderr)=>{
            if(error){
                return reject(stderr || error.message);
            }
            resolve(stdout);
        }
    );
    })
}

module.exports={runPython};