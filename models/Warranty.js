const mongoose = require('mongoose');

const warrantySchema = new mongoose.Schema({
    name: String,
    email: String,
    serialNumber: String,
    purchaseDate: Date,
    expiryDate: Date,
    billPdf: String
});

const Warranty = mongoose.model('Warranty', warrantySchema);

module.exports = Warranty;
