const si = require('systeminformation');
const axios = require('axios');
const { exec } = require('child_process');

async function fetchSystemInfo() {
    try {
        const system = await si.chassis();
        const system2 = await si.system();

        // Generate a random number
        const randomNumber = Math.floor(Math.random() * 10000);

        const systemInfo = {
            manufacturer: system.manufacturer || "N/A",
            Model: system2.model,
            Serial_Number: system.assetTag || "N/A",
            ipAdd: randomNumber // Store the random number in ipAdd
        };
         

        // Send system information to the server
        await axios.post('https://support.bitboxpc.com/system-info', systemInfo);

        // Open a URL in the default web browser with the random number as a query parameter
        openWebsite(`https://support.bitboxpc.com/temp?randomNumber=${randomNumber}`);
    } catch (error) {
        console.error('Error fetching or sending system information:', error);
    }
}

function openWebsite(url) {
    const platform = process.platform;

    let command;

    if (platform === 'win32') {
        command = `start ${url}`;
    } else if (platform === 'darwin') {
        command = `open ${url}`;
    } else if (platform === 'linux') {
        command = `xdg-open ${url}`;
    } else {
        console.error('Unsupported platform:', platform);
        return;
    }

    exec(command, (error) => {
        if (error) {
            console.error(`Error opening website: ${error.message}`);
        } else {
            console.log(`Website opened: ${url}`);
        }
    });
}

// Keep the script running until the user presses Enter
process.stdin.resume();
process.stdin.setEncoding('utf8');
setTimeout(function () {
    console.log('Auto terminating after 3 seconds...');
    process.exit();
}, 20000);

// Fetch system information
fetchSystemInfo();
