// const {submitCode,getSubmissionResult} = require("../services/judge0Service");

// const runCode=async(req,res)=>{

//     try{

//         const {language,code}=req.body;

//         if(!language || !code){
//             return res.status(400).json({
//                 success:false,
//                 message:"Language and code are required"
//             });
//         }

//         const token=await submitCode(
//             language,
//             code
//         );

//         // Wait For Execution
//         setTimeout(async ()=>{
         
//             try{

//                 const result=await getSubmissionResult(token);

//                 res.status(200).json({success:true,result});

//             }catch(error){

//                 res.status(500).json({
//                     success:false,
//                     message:error.message
//                 })
//             }
//         },3000);

//     }catch(error){
//         res.status(500).json({success:false,message:error.message});
//     }
// };

// module.exports={
//     runCode,

// }


const {runjavascript}=require("../services/compilerService");
const { runCpp } = require("../services/cppCompiler");
const { runJava } = require("../services/javaCompiler");
const { runPython } = require("../services/pythonCompiler");
const { runDockerWorkspaceCode } = require("../services/dockerCompiler");
const WorkspaceItem = require("../models/WorkspaceItem");
const { logActivity } = require("./activityControllers");


const runCode=async(req,res)=>{
     console.log(req.body);

    try{
        const {language,code,input,roomId,roomTitle}=req.body;

         // Validation (code is required only as fallback for legacy sandboxes)
        if (!language) {
            return res.status(400).json({
                success: false,
                message: "Language is required"
            });
        }

        let output;
        
        // 1. Check if this room contains any workspace files
        const workspaceCount = await WorkspaceItem.countDocuments({ roomId, type: "file" });
        
        if (workspaceCount > 0) {
            // Run as a multi-file workspace compile
            output = await runDockerWorkspaceCode(roomId, language, input);
        } else {
            // Fallback: Run legacy single-file code buffer
            if (!code) {
                return res.status(400).json({
                    success: false,
                    message: "Code is required for single-file buffer execution"
                });
            }

            if(language==="javascript"){
                output=await runjavascript(code,input);
            }
            else if(language=="python"){
                output=await runPython(code,input);
            }
            else if(language=="cpp"){
              output=await runCpp(code,input);
            }
            else if(language=="java"){
              output=await runJava(code,input);
            }
            else
            {
                return res.status(400).json({
                    success:false,
                    message:"Language not supported"
                });
            }
        }

        const User = require("../models/User");
        await User.findByIdAndUpdate(req.user._id, { $inc: { executionsCount: 1 } });

        await logActivity(req.user._id, req.user.username, roomId || null, roomTitle || "Sandbox", "executed");
       
        res.status(200).json({
            success:true,
            output
        });

    }catch(error){
        res.status(500).json({success:false,output:error.message || String(error)})
    }
}

module.exports={
    runCode,
}