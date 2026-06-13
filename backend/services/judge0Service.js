// const axios=require("axios");

// //language mapping
// const languageMap={
//     javascript:63,
//     python:71,
//     cpp:54,
//     java:62
// };

// //submit code for execution
// const submitCode=async(language,sourceCode)=>{

//     try{
        
//         const language_id=languageMap[language];
        
//         if(!language_id){
//             throw new Error("Unsupported Language");
//         }
        
// console.log(process.env.RAPID_API_KEY);
// console.log(process.env.RAPID_API_HOST);
// console.log(process.env.JUDGE0_API_URL);
//         //send code to judge0
//         const response=await axios.post(process.env.JUDGE0_API_URL,
//             {
//                 source_code:sourceCode,
//                 language_id
//             },
//             {
//               headers: {
//                     "Content-Type": "application/json",
//                     "X-RapidAPI-Key":
//                         process.env.RAPID_API_KEY,

//                     "X-RapidAPI-Host":
//                         process.env.RAPID_API_HOST
//                 }
//             }
//         );

//         return response.data.token;

//     }catch(error){
//         console.log("Judge0 Submit Error",error.message);
//         throw error;
//     }
// };

// //get execution result
// // Get Execution Result
// const getSubmissionResult = async (token) => {
    
//     try {
//         const response = await axios.get(
//             `${process.env.JUDGE0_API_URL}/${token}`,
//             {
//                 headers: {
//                     "X-RapidAPI-Key":
//                         process.env.RAPID_API_KEY,

//                     "X-RapidAPI-Host":
//                         process.env.RAPID_API_HOST
//                 }
//             }
//         );
//         return response.data;

//     } catch (error) {
//         console.log(
//             "Judge0 Result Error:",
//             error.message
//         );
//         throw error;
//     }
// };

// module.exports={
//     submitCode,
//     getSubmissionResult
// }