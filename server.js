const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const session = require('express-session');
const cors = require('cors');
const Driver = require('./models/Driver');
const Warranty = require('./models/Warranty');
const SystemInfo = require('./models/SystemInfo'); // Ensure this path is correct
const os = require('os');
const app = express();
const port = 7700;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());
app.use(express.static('public'));
app.use('/admin', express.static(path.join(__dirname, 'views', 'admin')));

// Serve static files from the 'uploads' and 'scripts' directory
app.use('/uploads', express.static('uploads'));
app.use('/scripts', express.static(path.join(__dirname, 'scripts')));
app.use('/statics', express.static(path.join(__dirname, 'statics')));

// Use sessions
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Use true in production with HTTPS
}));

// MongoDB Atlas connection
const dbURI = 'mongodb+srv://bitboxadmin:bitboxadmin@Bitbox.cyggvsi.mongodb.net/Bitbox_db?retryWrites=true&w=majority';
mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log('MongoDB connected');
    })
    .catch((err) => {
        console.error('Database connection error:', err);
    });

app.set('view engine', 'ejs');

// Home Route
app.get('/', (req, res) => {
    res.render('index');
});

const getClientIpAddress = (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    const ipAddress = forwarded ? forwarded.split(',')[0].trim() : req.connection.remoteAddress;
    console.log("Client IP Address: " + ipAddress);
    return ipAddress;
};

app.get('/get_local_ip', async (req, res) => {
    try {
        const ipAddress = getClientIpAddress(req);
        console.log("Client IP Address: " + ipAddress);

        // Sending the IP address in the response
        res.json({ ip: ipAddress });
    } catch (error) {
        console.error('Error getting IP address:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Device Check Route
app.get('/check-device', async (req, res) => {
    res.render('check-device', { systemInfo: req.session.systemInfo });
});

// Endpoint to receive and save system information
app.post('/system-info', async (req, res) => {
    try {
       const { manufacturer, Model, Serial_Number, ipAdd } = req.body;

        if (!manufacturer || !Model || !Serial_Number || !ipAdd) {
            return res.status(400).send('All fields are required');
        }

        // Find an existing entry with the same ipAdd and update it, or create a new entry if it doesn't exist
        const existingSystemInfo = await SystemInfo.findOneAndUpdate(
            { ipAdd },
            { manufacturer, Model, Serial_Number, ipAdd },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        console.log('System information saved or updated:', existingSystemInfo);
        
        // Save systemInfo to session
        req.session.systemInfo = systemInfo;
        
        res.status(200).send('System information saved successfully');
    } catch (error) {
        console.error('Error saving system information:', error);
        res.status(500).send('Error saving system information');
    }
});

// Endpoint to fetch the latest system information
app.get('/fetch-system-info', async (req, res) => {
    const ip = req.query.ip;
    try {
        const systemInfo = await SystemInfo.findOne({ ipAdd: ip }).exec();
        console.log('Received ip:', ip);
        console.log('Received system info:', systemInfo);
        if (systemInfo) {
            res.json(systemInfo);
        } else {
            res.status(404).json({ error: 'System info not found for this IP address' });
        }
    } catch (error) {
        console.error('Error fetching system information:', error);
        res.status(500).send('Error fetching system information');
    }
});

// Fetch Driver Details
app.get('/latest-driver', async (req, res) => {
    const serial = req.query.serial;
    try {
        const drivers = await Driver.find({ serial: serial });
        res.render('latest-driver', { drivers });
    } catch (error) {
        console.error('Error fetching drivers:', error);
        res.status(500).send('Error fetching drivers');
    }
});

// Warranty Check Route
app.get('/check-warranty', async (req, res) => {
    const serialNumber = req.query.serial;
    try {
        const warranty = await Warranty.findOne({ serialNumber: serialNumber });
        if (warranty) {
            res.json({ status: 'registered', expiryDate: warranty.expiryDate });
        } else {
            res.json({ status: 'not_registered' });
        }
    } catch (error) {
        console.error('Error checking warranty:', error);
        res.status(500).send('Error checking warranty');
    }
});

// Warranty Registration Route
app.get('/register-warranty', (req, res) => {
    res.render('register-warranty');
});

// Multer storage configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Multer file filter to accept only PDFs and EXEs
const fileFilter = (req, file, cb) => {
    const allowedTypes = /pdf|exe/;
    const mimetype = allowedTypes.test(file.mimetype);
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb('Error: File upload only supports PDF and EXE files!');
    }
};

// Initialize multer with storage and file filter
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // Limit file size to 10 MB
});

app.post('/register-warranty', upload.single('billPdf'), async (req, res) => {
    const { name, email, serialNumber, purchaseDate, expiryDate } = req.body;
    const billPdfPath = req.file.path;

    try {
        const newWarranty = new Warranty({
            name,
            email,
            serialNumber,
            purchaseDate,
            expiryDate,
            billPdf: billPdfPath
        });

        await newWarranty.save();

        res.send('Warranty registered successfully');
    } catch (error) {
        console.error('Error registering warranty:', error);
        res.status(500).send('Error registering warranty');
    }
});

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
    if (req.session.isAuthenticated) {
        return next();
    } else {
        res.redirect('/admin');
    }
}

// Admin Routes
app.get('/admin', (req, res) => {
    res.render('admin/login');
});

app.post('/admin/login', (req, res) => {
    const { username, password } = req.body;
    const adminUsername = 'admin';
    const adminPassword = 'password';

    if (username === adminUsername && password === adminPassword) {
        req.session.isAuthenticated = true;
        res.redirect('/admin/dashboard');
    } else {
        res.send('Invalid credentials');
    }
});

// Admin Dashboard Route
app.get('/admin/dashboard', isAuthenticated, async (req, res) => {
    try {
        const drivers = await Driver.find();
        const warranties = await Warranty.find();
        res.render('admin/dashboard', { drivers, warranties });
    } catch (error) {
        res.status(500).send('Error fetching data');
    }
});

// Upload Driver Route
app.get('/admin/drivers/upload', isAuthenticated, (req, res) => {
    res.render('admin/upload');
});

app.post('/admin/drivers/upload', isAuthenticated, upload.single('driverFile'), async (req, res) => {
    try {
        const { serial, model, version} = req.body;
        const downloadLink = `/uploads/${req.file.filename}`;

        const newDriver = new Driver({ serial, model, version, downloadLink });
        await newDriver.save();

        res.redirect('/admin/dashboard');
    } catch (error) {
        console.error('Error uploading driver:', error);
        res.status(500).send('Error uploading driver');
    }
});

// Delete Driver Route
app.post('/admin/drivers/delete/:id', isAuthenticated, async (req, res) => {
    const driverId = req.params.id;
    try {
        await Driver.findByIdAndDelete(driverId);
        res.redirect('/admin/dashboard');
    } catch (error) {
        res.status(500).send('Error deleting driver');
    }
});

// View All Drivers Route
app.get('/admin/drivers', isAuthenticated, async (req, res) => {
    try {
        const drivers = await Driver.find();
        res.render('admin/drivers', { drivers });
    } catch (error) {
        res.status(500).send('Error fetching drivers');
    }
});

// Logout Route
app.get('/admin/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.redirect('/admin/dashboard');
        }
        res.redirect('/admin');
    });
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
