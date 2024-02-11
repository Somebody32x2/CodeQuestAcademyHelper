const fs = require('fs');
const {diffStringsUnified} = require("jest-diff");
const {LineEndingCorrector} = require("line-ending-corrector");
const unzipper = require("unzipper");

// const path = require('path');
function downloadNextProblem() {
    fetch("https://lmcodequestacademy.com/api/quest/get-problems", {
        "headers": {
            "accept": "application/json, text/plain, */*",
            "accept-language": "en-US,en;q=0.9",
            "content-type": "application/json",
            "sec-ch-ua": "\"Google Chrome\";v=\"111\", \"Not(A:Brand\";v=\"8\", \"Chromium\";v=\"111\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"Windows\"",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "cookie": "",
            "Referer": "https://lmcodequestacademy.com/quest?status=not-started",
            "Referrer-Policy": "strict-origin-when-cross-origin"
        },
        "body": "{\"limit\":10,\"offset\":0,\"status\":\"not-started\",\"filter\":\"\",\"difficulty\":0,\"userID\":\"\"}",
        "method": "POST"
    }).then(response => response.json()).then(data => {
            console.log(data)
            let skippedProblems = fs.readFileSync("skippedProblems.txt", "utf8").split("\n");
            let thisProblem = data.problems[0];
            while (skippedProblems.includes(thisProblem.slug)) {
                thisProblem = data.problems.shift();
            }
            // Select the first non-skipped problem
            console.dir(thisProblem);

            // Make a new folder for the problem
            try {
                fs.mkdirSync("../" + thisProblem.slug);
            } catch (e) {
                if (e.errno === -4075) console.log("Directory already exists");
                else console.log(e);
            }

            // Set the current problem in activeProblem.txt
            fs.writeFileSync("activeProblem.txt", thisProblem.slug);

            // Create a solve.py file in the problem folder
            fs.writeFileSync(`../${thisProblem.slug}/solve.py`, `# Path: ${thisProblem.slug}/solve.py\n` + fs.readFileSync("template.txt"))

            // Open the problem description in the browser
            const open = require("open");
            open(`https://lmcodequestacademy.com/api/static/problems/${thisProblem.slug}`);

            // Download and unzip the test cases
            const download = require('download');
            download(`https://lmcodequestacademy.com/api/static/samples/${thisProblem.slug}`, "../" + thisProblem.slug).then(() => {
                console.log('downloaded tests!');

                // Unzip the test cases to the folder for the problem and delete the zip file
                const unzipper = require('unzipper');
                fs.createReadStream(`../${thisProblem.slug}/${thisProblem.slug}-samples.zip`)
                    .pipe(unzipper.Extract({path: `../${thisProblem.slug}`}));
                setTimeout(() => {
                    fs.unlinkSync(`../${thisProblem.slug}/${thisProblem.slug}-samples.zip`)
                }, 1000);
            });


        }
    );
}

function testCurrentProblem() {
    // Get the current problem from activeProblem.txt
    let currentProblem = fs.readFileSync("activeProblem.txt", "utf8");
    console.log("Testing " + currentProblem);
    // Run the test cases for the current problem (in ../activeProblem)
    // by comparing (1.out == 1.in | solve.py, for each pair of files)
    // and outputting the results to the console

    // Get the list of files in the current problem folder
    const path = require('path');
    const directoryPath = path.join(__dirname, `../${currentProblem}`);

    fs.readdir(directoryPath, function (err, files) {
        //handling error
        if (err) {
            return console.log('Unable to scan directory: ' + err);
        }
        //listing all files using forEach
        files.forEach(function (file) {
            if (file.includes(".in")) {
                // Run the test case
                const {execSync} = require('child_process');
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

function skipCurrent() {
    // Add the current problem to the list of skipped problems in skippedProblems.txt
    let currentProblem = fs.readFileSync("activeProblem.txt", "utf8");
    fs.appendFileSync("skippedProblems.txt", currentProblem + "\n");
    // Download the next problem
    downloadNextProblem();
}

// If this was run with --test, test the current problem, if --next, get the next problem
if (process.argv[2] === "--test") {
    testCurrentProblem();
} else if (process.argv[2] === "--next") {
    downloadNextProblem();
} else if (process.argv[2] === "--skip") {
    skipCurrent();
}
