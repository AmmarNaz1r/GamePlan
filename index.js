// Import express and ejs
var express = require ('express')
var ejs = require('ejs')
var session = require ('express-session')
//Import mysql module
var mysql = require('mysql2')
var validator = require ('express-validator');
const expressSanitizer = require('express-sanitizer');

// Create the express application object
const app = express()
const port = 8000


app.set('view engine', 'ejs')

// Set up the body parser 
app.use(express.urlencoded({ extended: true }))
app.use(expressSanitizer());
app.use(express.json()); // Enables JSON parsing in requests
app.use(express.urlencoded({ extended: true })); // Enables form data parsing

// Set up public folder 
app.use(express.static(__dirname + '/public'))

// sessions
app.use(session({
    secret: 'sOm3rand0m5tuf',
    resave: false,
    saveUninitialized: false,
    cookie: {
        expires: 600000
    }
}))


// Define the database connection
const db = mysql.createConnection ({
    host: 'localhost',
    user: 'appuser',
    password: 'app2027',
    database: 'bettys_books'
})
// Connect to the database
db.connect((err) => {
    if (err) {
        throw err
    }
    console.log('Connected to database')
})
global.db = db

// Define our application-specific data
app.locals.shopData = {shopName: "Bettys Books"}


const API = require('./routes/api')
app.use('/api', API)


// Start the web app listening
app.listen(port, () => console.log(`Node app listening on port ${port}!`))