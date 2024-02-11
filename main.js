import fs from "fs";
import {diffStringsUnified} from "jest-diff";
import LineEndingCorrector from "line-ending-corrector";
import unzipper from "unzipper";
import * as readline from 'node:readline/promises';
import {stdin as input, stdout as output} from 'node:process';
import login from "./login.js";
import getProblems from "./get-problems.js";
import download from "download";
import * as path from "path";
import open from "open";

// const path = require('path');
function downloadProblem(problem) {

    if (fs.existsSync(`../${problem.slug}`)) {
        console.log("Problem already downloaded!");
        return;
    }
    // Make a new folder for the problem
    try {
        fs.mkdirSync("../" + problem.slug);
    } catch (e) {
        if (e.errno === -4075) {
            console.log("Directory already exists");
            return;
        }
        else console.log(e);
    }


    // Create a solve.py file in the problem folder
    fs.writeFileSync(`../${problem.slug}/solve.py`, `# Path: ${problem.slug}/solve.py\n` + fs.readFileSync("template.txt"))


    // Download and unzip the test cases
    download(`https://lmcodequestacademy.com/api/static/samples/${problem.slug}`, "../" + problem.slug).then(() => {
        console.log('downloaded tests!');

        // Unzip the test cases to the folder for the problem and delete the zip file
        fs.createReadStream(`../${problem.slug}/${problem.slug}-samples.zip`)
            .pipe(unzipper.Extract({path: `../${problem.slug}`}));
        setTimeout(() => {
            fs.unlinkSync(`../${problem.slug}/${problem.slug}-samples.zip`)
        }, 1000);
    });
    // Download the problem statement
    download(`https://lmcodequestacademy.com/api/static/problems/${problem.slug}`, "../" + problem.slug).then(() => {
        console.log('Downloaded problem statement!');
        // open the problem statement in the default browser
        // Get the path to the problem statement

        const problemStatementPath = path.join(__dirname, `../${problem.slug}/${problem.slug}.pdf`);
        // Open the problem statement in the default PDF viewer
        open(problemStatementPath);
    });
    // Download the resource packet (if it exists)
    download(`https://lmcodequestacademy.com/resource-packets/resources/${problem.slug}.pdf`, "../" + problem.slug).then(() => {
        console.log('Downloaded resource packet!');
    });
}

function testProblem(problem) {
    // Get the current problem from activeProblem.txt
    console.log("Testing " + problem.slug);
    // Run the test cases for the current problem (in ../activeProblem)
    // by comparing (1.out == 1.in | solve.py, for each pair of files)
    // and outputting the results to the console

    // Get the list of files in the current problem folder
    const directoryPath = path.join(__dirname, `../${problem.slug}`);

    fs.readdir(directoryPath, function (err, files) {
        //handling error
        if (err) {
            return console.log('Unable to scan directory: ' + err);
        }
        //listing all files using forEach
        files.forEach(function (file) {
            if (file.includes(".in")) {
                // Run the test case
                import {execSync} from 'child_process';
                // Spawn the process and pipe the input file to the process
                const testOut = execSync('py solve.py', {
                    cwd: `../${currentProblem}`,
                    input: fs.readFileSync(`../${currentProblem}/${file}`)
                });
                // Compare the output of the process to the expected output, ignoring different line endings
                let expectedOutput = fs.readFileSync(`../${currentProblem}/${file.replace(".in", ".out")}`);
                const {diffStringsUnified} = require('jest-diff');
                const LineEndingCorrector = require('line-ending-corrector').LineEndingCorrector

                if (LineEndingCorrector.correctSync(testOut.toString())[1] === expectedOutput.toString()) {
                    console.log(`\x1b[32mTest case #${file.split(".")[0]} passed! ✅ \x1b[0m`);
                } else {
                    console.log(`\x1b[31mTest case #${file.split(".")[0]} failed! ❌ \x1b[0m`);
                    console.log(diffStringsUnified(expectedOutput.toString(), LineEndingCorrector.correctSync(testOut.toString())[1]));
                    // Log the full expected and actual output
                    console.log(`Expected output: \n${expectedOutput.toString()}`);
                    console.log(`Actual output: \n${LineEndingCorrector.correctSync(testOut.toString())[1]}`);
                }
            }
        });
    });
}

// function skipCurrent() {
//     // Add the current problem to the list of skipped problems in skippedProblems.txt
//     let currentProblem = fs.readFileSync("activeProblem.txt", "utf8");
//     fs.appendFileSync("skippedProblems.txt", currentProblem + "\n");
//     // Download the next problem
//     downloadNextProblem();
// }

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
let session = await login();
let questions = await getProblems(session);
console.log("Questions: ");
for (let i = 0; i < questions.length; i++) {
    console.log(`${i + 1}. ${questions[i].title} (${questions[i].slug}; status: ${questions[i].status === "" ? "none" : questions[i].status}; ${questions[i].difficulty.name})`);
}
// Check if state.json exists, if so prompt to resume from last question with name
let state = null
if (fs.existsSync("state.json")) {
    state = JSON.parse(fs.readFileSync("state.json", "utf8"));
    console.log(`Resume ${state.lastQuestion.title} (${state.lastQuestion.slug}; ${state.lastQuestion.difficulty.name})`);
}
let qNum = null
while (!isNaN(+qNum) || (qNum === "resume" && state)) qNum = await rl.question('What Question to Work On? (#/resume): ');

let question = qNum === "resume" ? state?.lastQuestion : questions[+qNum - 1];
if (!question) {
    console.log("Invalid question number");
    process.exit(1);
}
// Save the current question to state.json
fs.writeFileSync("state.json", JSON.stringify({lastQuestion: question}));

// Download the problem
downloadProblem(question);

// Event Loop
// while (true) {
//
//
// }