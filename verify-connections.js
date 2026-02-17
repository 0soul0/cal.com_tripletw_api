const http = require('http');
const https = require('https');


// 測試指令
//  node verify-connections.js https://calcomtripletechapi.zeabur.app/api/threshold/2
// Configuration
const TOTAL_REQUESTS = 50;
const CONCURRENCY = 50; // Try to fire all at once
const PORT = 3001;
// Allow passing URL from command line: node verify-connections.js https://your-app.zeabur.app/api
const TARGET_URL = process.argv[2] || `http://localhost:${PORT}/api`;

const client = TARGET_URL.startsWith('https') ? https : http;

console.log(`Starting load test against ${TARGET_URL}`);
console.log(`Sending ${TOTAL_REQUESTS} requests with concurrency ${CONCURRENCY}...`);

let completed = 0;
let errors = 0;
const start = Date.now();

for (let i = 0; i < TOTAL_REQUESTS; i++) {
    const reqStart = Date.now();
    client.get(TARGET_URL, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            const duration = Date.now() - reqStart;
            // console.log(`Request ${i + 1} finished in ${duration}ms with status ${res.statusCode}`);
            if (res.statusCode !== 200) {
                console.error(`Request ${i + 1} failed with status ${res.statusCode}`);
                errors++;
            }
            completed++;
            checkDone();
        });
    }).on('error', (err) => {
        console.error(`Request ${i + 1} error:`, err.message);
        errors++;
        completed++;
        checkDone();
    });
}

function checkDone() {
    if (completed === TOTAL_REQUESTS) {
        const totalDuration = Date.now() - start;
        console.log('\n--- Load Test Complete ---');
        console.log(`Total Requests: ${TOTAL_REQUESTS}`);
        console.log(`Successful: ${TOTAL_REQUESTS - errors}`);
        console.log(`Failed: ${errors}`);
        console.log(`Total Duration: ${totalDuration}ms`);
        console.log(`Avg Request Duration: ${totalDuration / TOTAL_REQUESTS}ms`);

        if (errors === 0) {
            console.log('\n✅ PASSED: Server handled all requests without crashing.');
            console.log('If the duration is longer than a few ms, it means queuing happened (expected).');
        } else {
            console.log('\n❌ FAILED: Some requests failed.');
        }
    }
}
