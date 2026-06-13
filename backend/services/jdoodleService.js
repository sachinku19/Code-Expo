/**
 * Language mapping configuration for JDoodle API.
 * Maps compiler/interpreter language name and version index.
 */
const languageMap = {
    javascript: { language: "nodejs", versionIndex: "4" },
    python: { language: "python3", versionIndex: "4" },
    cpp: { language: "cpp", versionIndex: "5" },
    java: { language: "java", versionIndex: "4" }
};

/**
 * Executes source code via the JDoodle API
 * @param {string} language - The language name (javascript, python, cpp, java)
 * @param {string} sourceCode - The code to execute
 * @param {string} [stdin=""] - Standard input to pass to the program
 * @returns {Promise<string>} The execution output (combined stdout and stderr)
 */
const executeCode = async (language, sourceCode, stdin = "") => {
    try {
        const config = languageMap[language];
        if (!config) {
            throw new Error(`Unsupported Language: ${language}`);
        }

        const clientId = process.env.JDOODLE_CLIENT_ID;
        const clientSecret = process.env.JDOODLE_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            throw new Error("JDoodle client ID or client secret is missing from environment configurations.");
        }

        const url = "https://api.jdoodle.com/v1/execute";

        console.log(`[JDoodle Service] Sending execution request for ${language}...`);

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                clientId,
                clientSecret,
                script: sourceCode,
                language: config.language,
                versionIndex: config.versionIndex,
                stdin
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`JDoodle API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        if (data.error) {
            return `Execution Error: ${data.error}`;
        }

        return data.output || "";

    } catch (error) {
        console.error("JDoodle Service Error:", error.message);
        throw error;
    }
};

module.exports = {
    executeCode
};
