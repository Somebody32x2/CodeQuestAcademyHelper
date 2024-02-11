import * as readline from 'node:readline/promises';
import {stdin as input, stdout as output} from 'node:process';
import * as dotenv from 'dotenv'
import * as fs from 'fs';

dotenv.config()
export let session = null;

async function authenticate() {
    // Load session from session.json, if it exists, and check if it's still valid
    if (fs.existsSync('session.json')) {
        session = JSON.parse(fs.readFileSync('session.json', 'utf8'));
        if (await checkAuthenticated()) {
            console.log("Hello, " + session.name + "! (Restored From Session.json)");
            return;
        } else {
            console.error('Session Expired!');
        }
    }
    const rl = readline.createInterface({input, output});

    let email = process.env.CQA_EMAIL;
    let password = process.env.CQA_PASSWORD;
    if (email && password) {
        console.error('Using Saved Credentials!');
    } else {
        email = await rl.question('Enter your CQA email: ');
        password = await rl.question('Enter your CQA password: ');
    }
    let resp = await fetch("https://lmcodequestacademy.com/api/auth/login", {
        "headers": {
            "accept": "application/json, text/plain, */*",
            "accept-language": "en-US,en;q=0.9",
            "cache-control": "no-cache",
            "content-type": "application/json",
            "pragma": "no-cache",
            "sec-ch-ua": "\"Not A(Brand\";v=\"99\", \"Google Chrome\";v=\"121\", \"Chromium\";v=\"121\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"Windows\"",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin"
        },
        "referrer": "https://lmcodequestacademy.com/auth/login",
        "referrerPolicy": "strict-origin-when-cross-origin",
        "body": `{\"email\":\"${email}\",\"confirmPassword\":\"${password}\",\"rememberMe\":true,\"showPassword\":false}`,
        // "body": `{\"email\":\"samuelshuster@gmail.com\",\"confirmPassword\":\"M25wgsSWBK@mi@P\",\"rememberMe\":true,\"showPassword\":false}`,
        "method": "POST",
        "mode": "cors",
        "credentials": "include"
    });
    // Get the Set-Cookie headers
    let cookies = resp.headers.get("Set-Cookie");

    resp = await resp.json();
    if (!resp.authenticated) {
        console.error('Invalid Credentials/Failed to Authenticate!');
        return await authenticate();
    } else {
        session = {
            id: resp.user.id,
            name: resp.user.fullName,
            accessToken: resp.tokens.accessToken,
            refreshToken: resp.tokens.refreshToken,
            cookies: cookies
        };
        // Save session to session.json

        fs.writeFileSync('session.json', JSON.stringify(session));
        console.log("Hello, " + session.name + "!");
        if (!process.env.CQA_EMAIL || !process.env.CQA_PASSWORD || process.env.CQA_EMAIL !== email || process.env.CQA_PASSWORD !== password) {
            // Ask to save credentials
            let save = await rl.question('Do you want to save your credentials? (y/n): ');
            if (save.toLowerCase() === 'y') {
                // Save credentials to .env file
                console.log('Saving Credentials...');
                fs.appendFileSync('.env', `CQA_EMAIL=${email}\nCQA_PASSWORD=${password}\n`); // TODO: Do not append if already exists (do this more elegantly)
                console.log('Credentials Saved!');
            }
        }
    }
    return session;
}
async function checkAuthenticated() {
    if (session === null) {
        return false
    }
    let resp = await fetch("https://lmcodequestacademy.com/_next/data/qy2F6IgDzIQBvd4ylxigz/dashboard.json", {
        "headers": {
            "accept": "*/*",
            "accept-language": "en-US,en;q=0.9",
            "cache-control": "no-cache",
            "pragma": "no-cache",
            "sec-ch-ua": "\"Not A(Brand\";v=\"99\", \"Google Chrome\";v=\"121\", \"Chromium\";v=\"121\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"Windows\"",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "connection": "keep-alive",
            "cookie": session.cookies
        },
        "referrer": "https://lmcodequestacademy.com/auth/login",
        "referrerPolicy": "strict-origin-when-cross-origin",
        "body": null,
        "method": "GET",
        "mode": "cors",
        "credentials": "include",
    });
    resp = await resp.json().catch(() => {
        return false;
    });
    console.log(resp);
    if (resp.pageProps?.user?.authenticated) {
        return true;
    }
}
export default authenticate;
