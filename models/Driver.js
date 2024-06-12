const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
    serial: { type: String, required: true },
    model: { type: String, required: true },
    version: { type: String, required: true },
    downloadLink: { type: String, required: true }
});

module.exports = mongoose.model('Driver', driverSchema);
