const si = require('systeminformation');
const axios = require('axios');

// async function fetchSystemInfo() {
//     try {
//         // Fetching IP address using axios
//         const response = await axios.get('https://api.ipify.org?format=json');
//         const ipAddress = response.data.ip;

//         const system = await si.chassis();
//         const systemInfo = {
//             manufacturer: system.manufacturer || "N/A",
//             Model: system.model || "N/A",
//             Serial_Number: system.assetTag || "N/A",
//             ipAdd: ipAddress
//         };


//         console.log('System Information:', systemInfo);

//         // Send system information to the server
//         await axios.post('https://support.bitboxpc.com/system-info', systemInfo);

//         console.log('System information has been sent to the server');
//     } catch (error) {
//         console.error('Error fetching or sending system information:', error);
//     }
// }



// // Keep the script running until the user presses Enter
// process.stdin.resume();
// process.stdin.setEncoding('utf8');
// setTimeout(function () {
//     console.log('Auto terminating after 3 seconds...');
//     process.exit();
// }, 10000);

// // Fetch system information
// fetchSystemInfo();


async function fetchSystemInfo() {
    try {
        const system = await si.chassis();
        const system2 = await si.system();
        const ipAddressResponse = await axios.get('https://support.bitboxpc.com/get_local_ip');
        const ipAddress = ipAddressResponse.data.ip;

        const systemInfo = {
            manufacturer: system.manufacturer || "N/A",
            Model: system2.model,
            Serial_Number: system.assetTag || "N/A",
        
            
        
            ipAdd: ipAddress
        };

        console.log('System Information:', systemInfo);

        // Send system information to the server
        await axios.post('https://support.bitboxpc.com/system-info', systemInfo);

        console.log('System information has been sent to the server');
    } catch (error) {
        console.error('Error fetching or sending system information:', error);
    }
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

