export default async function getProblems(session, limit=30, difficulty=0, offset=0, status="not-started", filter="") {
    let resp = await fetch("https://lmcodequestacademy.com/api/quest/get-problems", {
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
            "sec-fetch-site": "same-origin",
            "cookie": session.cookies,
            "connection": "keep-alive",
        },
        "referrer": "https://lmcodequestacademy.com/quest?status=wrong-answer",
        "referrerPolicy": "strict-origin-when-cross-origin",
        "body": `{"limit":${limit},"offset":${offset},"status":"${status}","filter":"${filter}","difficulty":${difficulty},"userID":"${session.id}"}`,
        "method": "POST",
        "mode": "cors",
        "credentials": "include"
    }); // TODO: Make this not refused by server
    resp = await resp.text();
    try {
        return JSON.parse(resp);
    } catch (e) {
        throw new Error("Failed to parse response from get-problems: " + resp + "\n" + e);
    }
}