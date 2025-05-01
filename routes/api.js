const express = require('express');
const bcrypt = require('bcrypt');
const session = require('express-session');
const axios = require('axios');
const router = express.Router();

const schedule = require("node-schedule"); 
const nodemailer = require("nodemailer");  


const transporter = nodemailer.createTransport({
    service: 'gmail', 
    auth: {
      user: 'GamePlanCalendarium@gmail.com', 
      pass: 'bfeg bzva zttj eruv'    
    }
  });
  
//currently set from between 1 to 5 mins for testing and for Supervisor's testing, final version would include 30mins, 2hours, 1 day, 3days, 1 week
function calculateReminderTimes(reminder) {
    const reminderTimes = [
        { name: '1 minute before', diff: -1 * 60 * 1000 },
        { name: '2 minutes before', diff: -2 * 60 * 1000 },
        { name: '3 minutes before', diff: -3 * 60 * 1000 },
        { name: '4 minutes before', diff: -4 * 60 * 1000 },
        { name: '5 minutes before', diff: -5 * 60 * 1000 }
    ];

    const [day, month, year] = reminder.date.split('/');  // dd/mm/yyyy
    const isoDate = `${year}-${month}-${day}`;
    const eventDate = new Date(`${isoDate}T${reminder.time}:00`);

    return reminderTimes.map(time => new Date(eventDate.getTime() + time.diff));
}

function scheduleEmailReminders(reminder) {
    const reminderTimes = calculateReminderTimes(reminder);

    reminderTimes.forEach(reminderTime => {
        if (reminderTime > new Date()) {
            console.log(` Scheduling "${reminder.title}" for: ${reminderTime}`);

            schedule.scheduleJob(reminderTime, () => {
                console.log(` Sending email for: "${reminder.title}" at ${new Date()}`);
                sendEmail(reminder);
            });
        }
    });
}

// Function to send the email
function sendEmail(reminder) {
    const mailOptions = {
      from: 'GamePlanCalendarium@gmail.com',
      to: reminder.userEmail,
      subject: `Reminder: ${reminder.title}`,
      text: `Hi there! This is a reminder for your event "${reminder.title}" scheduled for ${reminder.date} at ${reminder.time}.`
    };
  
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log('Error sending email:', error);
      } else {
        console.log('Email sent:', info.response);
      }
    });
  }

router.get('/', (req, res) => {
    res.render('index');
});


router.get('/login', (req, res) => {
    res.render('login');
});

router.get('/register', (req, res) => {
    res.render('register');
});


// 1. Register Route (using email)
router.post('/register', (req, res) => {
  const { email, password } = req.body;

  // Hash the password
  bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) {
          console.error('Error hashing password:', err);
          return res.status(500).send('Internal server error');
      }

      // Insert the new user into the Users table
      const query = 'INSERT INTO Users (email, password) VALUES (?, ?)';
      db.query(query, [email, hashedPassword], (err, result) => {
          if (err) {
              console.error('Error inserting user:', err);
              return res.status(500).send('Error registering user');
          }
          res.render('login.ejs');
      });
  });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;

  const query = 'SELECT * FROM Users WHERE email = ?';
  db.query(query, [email], (err, users) => {
      if (err || users.length === 0) {
          console.error('Error fetching user:', err);
          return res.status(400).send('Invalid email or password');
      }

      const user = users[0];

      // Compare password
      bcrypt.compare(password, user.password, (err, isMatch) => {
          if (err || !isMatch) {
              console.error('Error comparing password:', err);
              return res.status(400).send('Invalid email or password');
          }

          // Store user info in session
          req.session.userId = user.userId;
          req.session.email = user.email;
          req.session.teamID = user.teamID;

          // Check if user has a teamID
          if (user.teamID === null) {
              console.log(" User has no team, redirecting to team selection.");
              return res.render('teamSelection.ejs');  // Redirect to team selection page
          }

          console.log(" User has a team, redirecting to main page.");
          res.redirect('/api/calendar');
        });
  });
});


// 3. Logout Route
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
      if (err) {
          console.error('Error destroying session:', err);
          return res.status(500).send('Error logging out');
      }
      res.send('Logged out successfully');
  });
});



const apiKey = '152f4cb1f1msh2047002e05469adp1adaa9jsnb3d914f57097';

// 1. Clear Data Route
router.get('/clear-data', (req, res) => {
    const queries = [
        'SET FOREIGN_KEY_CHECKS = 0',
        'DELETE FROM matches',
        'DELETE FROM teams',
        'DELETE FROM reminders WHERE isSystemGenerated = 1',
        'SET FOREIGN_KEY_CHECKS = 1'
    ];
    
    queries.forEach(query => {
        db.query(query, (err) => {
            if (err) {
                console.error('Error clearing data:', err);
            }
        });
    });
    res.send('Data cleared successfully');
});

// 2. Fetch Teams Route
router.get('/fetch-teams', (req, res) => {
    const url = 'https://football-web-pages1.p.rapidapi.com/teams.json?comp=1';
    
    axios.get(url, {
        headers: {
            'X-RapidAPI-Key': apiKey,
            'X-RapidAPI-Host': 'football-web-pages1.p.rapidapi.com'
        }
    }).then(response => {
        const teams = response.data.teams.map(team => ({
            id: team.id,
            fullName: team['full-name']
        }));

        teams.forEach(team => {
            const query = 'INSERT INTO teams (teamID, teamName) VALUES (?, ?) ON DUPLICATE KEY UPDATE teamName = ?';
            db.query(query, [team.id, team.fullName, team.fullName], (err) => {
                if (err) {
                    console.error('Error inserting team:', err);
                }
            });
        });

        res.send('Teams fetched and stored successfully');
    }).catch(error => {
        console.error('Error fetching teams:', error);
        res.status(500).send('Error fetching teams');
    });
});

// 3. Fetch Fixtures Route
router.get('/fetch-fixtures', (req, res) => {
    const teamQuery = 'SELECT teamID, teamName FROM teams';
    
    db.query(teamQuery, (err, teams) => {
        if (err) {
            console.error('Error fetching teams from database:', err);
            res.status(500).send('Error fetching teams');
            return;
        }

        const promises = teams.map((team, index) => {
            return new Promise(resolve => {
                setTimeout(() => {
                    fetchAndStoreFixtures(team.teamID, team.teamName).then(resolve);
                }, index * 1000);
            });
        });

        Promise.all(promises).then(() => {
            res.send('done');
        });
    });
});

// Function to fetch and store fixtures
function fetchAndStoreFixtures(teamID, teamName) {
    const url = `https://football-web-pages1.p.rapidapi.com/fixtures-results.json?team=${teamID}`;

    return new Promise((resolve, reject) => {
        axios.get(url, {
            headers: {
                'X-RapidAPI-Key': apiKey,
                'X-RapidAPI-Host': 'football-web-pages1.p.rapidapi.com'
            }
        }).then(response => {
            const fixtures = response.data['fixtures-results'].matches;

            if (fixtures && fixtures.length > 0) {
                let insertPromises = [];

                fixtures.forEach((match, index) => {
                    const homeTeam = match['home-team'].name;
                    const awayTeam = match['away-team'].name;
                    const opponent = getOpponent(homeTeam, awayTeam, teamName);
                    const date = new Date(match.date).toLocaleDateString('en-GB');
                    const time = match.time;
                    const competition = match.competition.name;
                    const matchNum = index + 1;

                    insertPromises.push(
                        insertFixture(teamID, matchNum, competition, opponent, date, time)
                    );
                });

                // Wait for all inserts to finish
                Promise.all(insertPromises).then(() => {
                    resolve();
                }).catch(err => {
                    console.error('Error inserting fixtures:', err);
                    resolve(); 
                });
            } else {
                resolve(); 
            }
        }).catch(err => {
            console.error('Error fetching fixtures:', err);
            resolve(); 
        });
    });
}


// Helper function to determine opponent
function getOpponent(homeTeam, awayTeam, teamName) {
    return homeTeam === teamName ? awayTeam : homeTeam;
}

// Function to insert a fixture into the database
function insertFixture(teamID, matchNum, competition, opponent, date, time) {
    return new Promise((resolve, reject) => {
        const query = 'INSERT INTO matches (teamID, matchNum, competition, opponent, matchDate, matchTime) VALUES (?, ?, ?, ?, ?, ?)';
        
        db.query(query, [teamID, matchNum, competition, opponent, date, time], (err) => {
            if (err) {
                console.error('Error inserting fixture:', err);
                return reject(err); 
            } else {
                console.log(`teamID: ${teamID}, Match ${matchNum} added`);
                resolve();
            }
        });
    });
}


// Route to regenerate reminders for all users
router.get('/regenerateAllReminders', (req, res) => {
  const query = 'SELECT userId, teamID FROM Users WHERE teamID IS NOT NULL';

  db.query(query, (err, users) => {
      if (err) {
          console.error('Error fetching users for reminder generation:', err);
          return res.status(500).send('Error generating reminders');
      }

      users.forEach(user => {
          generateReminders(user.userId, user.teamID);
      });

      res.send('Fixtures fetched and reminders regenerated.');
  });
});






// 4. Select Team Route


router.post('/select-team', (req, res) => {
    const { teamID } = req.body;
 
    if (!req.session.userId) {
        return res.status(403).send('You must be logged in to select a team');
    }
 
    // Update the selected team in the Users table
    const query = 'UPDATE Users SET teamID = ? WHERE userId = ?';
    db.query(query, [teamID, req.session.userId], (err, result) => {
        if (err) {
            console.error('Error updating selected team:', err);
            return res.status(500).send('Error selecting team');
        }
 
        // Generate reminders after the team is selected
        generateReminders(req.session.userId, teamID, res);
    });
 });
 

 const generateReminders = (userId, teamID, res) => {
    const reminderQuery = `SELECT matchNum, competition, opponent, matchDate, matchTime FROM matches WHERE teamID = ?`;

    db.query(reminderQuery, [teamID], (err, matches) => {
        if (err) {
            console.error('Error fetching matches:', err);
            return res ? res.status(500).send('Error fetching matches') : null;
        }

        const categoryColors = {
            'Premier League': '#32CD32',
            'Carabao Cup': '#F2B500',
            'Emirates FA Cup': '#C8102E',
            'Community Shield': '#002A5C',
            'UEFA Champions League': '#005BA6',
            'UEFA Europa League': '#F05233',
            'UEFA Europa Conference League': '#3C9E5F'
        };

        const categoriesToInsert = [];
        matches.forEach(match => {
            const competition = match.competition;
            if (!categoriesToInsert.includes(competition)) {
                categoriesToInsert.push(competition);
            }
        });

        // Insert categories if they don't exist
        categoriesToInsert.forEach(competition => {
            const color = categoryColors[competition];
            const insertCategoryQuery = `
                INSERT INTO categories (user_id, name, color)
                VALUES (?, ?, ?)
            `;

            db.query(insertCategoryQuery, [userId, competition, color], (err) => {
                if (err) {
                    console.error(`Error creating category for competition ${competition}:`, err);
                }
            });
        });

        const insertReminderQuery = `
            INSERT INTO Reminders (userID, reminderTitle, reminderDate, reminderTime, isSystemGenerated, category_id)
            VALUES (?, ?, ?, ?, 1, ?)
        `;

        matches.forEach(match => {
            const reminderTitle = `${match.competition}: Against ${match.opponent}`;
            const reminderDate = match.matchDate;
            const reminderTime = match.matchTime;

            const selectCategoryQuery = `
                SELECT id FROM Categories WHERE user_id = ? AND name = ?
            `;

            db.query(selectCategoryQuery, [userId, match.competition], (err, results) => {
                if (err) {
                    console.error(`Error finding category for competition ${match.competition}:`, err);
                    return;
                }

                const categoryId = results.length > 0 ? results[0].id : null;

                // Only create a reminder if the category exists
                if (categoryId) {
                    db.query(insertReminderQuery, [userId, reminderTitle, reminderDate, reminderTime, categoryId], (err) => {
                        if (err) {
                            console.error(`Error creating reminder for user ${userId}:`, err);
                        }
                    });
                }
            });
        });

        // Call the callback to load reminders after generation
        loadReminders(userId, res);
    });
};

// A new function to load reminders after they are created
const loadReminders = (userId, res) => {
    const query = `
        SELECT r.reminderTitle, r.reminderDate, r.reminderTime, r.reminderID, r.userID, r.category_id, r.description,
            c.name as categoryName, c.color as categoryColor
        FROM Reminders r
        LEFT JOIN categories c ON r.category_id = c.id
        WHERE r.userID = ?
        ORDER BY r.reminderDate, r.reminderTime;
    `;

    db.query(query, [userId], (err, rows) => {
        if (err) {
            console.error('Error fetching reminders:', err);
            return res.status(500).send('Database Error');
        }

        const formattedReminders = rows.map(reminder => ({
            title: reminder.reminderTitle,
            date: reminder.reminderDate,
            time: reminder.reminderTime,
            userID: reminder.userID,
            reminderID: reminder.reminderID,
            color: reminder.categoryColor,
            description: reminder.description
        }));

        // Redirect to calendar with reminders now available
        res.redirect('/api/calendar');
    });
};

const { format, startOfMonth, endOfMonth, getDay, eachDayOfInterval } = require("date-fns");
router.get("/calendar", async (req, res) => {
    try {
        const userID = req.session.userId;
        if (!userID) return res.redirect('/api/login');

        let year = parseInt(req.query.year) || new Date().getFullYear();
        let month = parseInt(req.query.month);
        if (isNaN(month) || month < 0 || month > 11) {
            month = new Date().getMonth();
        }

        const startDate = startOfMonth(new Date(year, month));
        const endDate = endOfMonth(new Date(year, month));
        const startDay = (getDay(startDate) + 6) % 7;
        const dates = eachDayOfInterval({ start: startDate, end: endDate });

        const daysArray = Array.from({ length: 42 }).fill(null);
        dates.forEach((date, index) => {
            daysArray[startDay + index] = format(date, "d");
        });

        const monthName = format(startDate, "MMMM");
        const yearName = format(startDate, "yyyy");

        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth();
        const currentDay = format(currentDate, "d");

        const reminderQuery = `
            SELECT 
                r.reminderTitle, r.reminderDate, r.reminderTime, 
                r.reminderID, r.userID, r.category_id, r.description,
                c.name as categoryName, c.color as categoryColor
            FROM Reminders r
            LEFT JOIN categories c ON r.category_id = c.id
            WHERE r.userID = ?
            ORDER BY r.reminderDate, r.reminderTime;
        `;

        const categoryQuery = `SELECT id, name, color FROM categories WHERE user_id = ?`;

        const reminders = await new Promise((resolve, reject) => {
            db.query(reminderQuery, [userID], (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });


        const categories = await new Promise((resolve, reject) => {
            db.query(categoryQuery, [userID], (err, results) => {
                if (err) return reject(err);
                resolve(results);
            });
        });


        const formattedReminders = reminders.map(reminder => ({
            title: reminder.reminderTitle,
            date: reminder.reminderDate,
            time: reminder.reminderTime,
            userID: reminder.userID,
            reminderID: reminder.reminderID,
            categoryId: reminder.category_id, 
            color: reminder.categoryColor,
            description: reminder.description
        }));

        res.render("calendar.ejs", {
            daysArray, monthName, yearName, year, month,
            currentYear, currentMonth, currentDay,
            reminders: formattedReminders,
            categories
        });

    } catch (err) {
        console.error("Error in /calendar:", err);
        res.status(500).send("Internal Server Error");
    }
});

// Add Reminder
router.post("/add-reminder", (req, res) => {
    const { title, date, time, description, categoryId } = req.body;
    const userId = req.session.userId;

    if (!userId) return res.status(401).json({ success: false, message: "Not logged in" });

    const query = `
        INSERT INTO Reminders (userID, reminderTitle, reminderDate, reminderTime, description, category_id, isSystemGenerated)
        VALUES (?, ?, ?, ?, ?, ?, 0)
    `;

    db.query(query, [userId, title, date, time, description, categoryId], (err, result) => {
        if (err) {
            console.error("Error adding reminder:", err);
            return res.status(500).json({ success: false, message: "Database error" });
        }

        // Fetch the user's email
        db.query("SELECT email FROM Users WHERE userId = ?", [userId], (err, userResult) => {
            if (err || userResult.length === 0) {
                console.error("Failed to fetch user email");
                return res.status(500).json({ success: false });
            }

            const userEmail = userResult[0].email;

            const reminder = {
                title,
                date,
                time,
                description,
                categoryId,
                userEmail
            };

            // Schedule the email reminders
            scheduleEmailReminders(reminder);

            res.json({ success: true });
        });
    });
});

router.delete("/delete-reminder/:id", async (req, res) => {
    const reminderID = req.params.id;  
         db.query("DELETE FROM Reminders WHERE reminderID = ?", [reminderID]);
         res.json({ success: true });
        }
);

router.use((req, res, next) => {
    console.log("Incoming request:", req.method, req.originalUrl);
    next();
  });

  

  router.put('/edit-reminder/:id', (req, res) => {
    const { id } = req.params;
    const { title, time, description, categoryId } = req.body;


    const sql = `
    UPDATE reminders 
      SET reminderTitle = ?, 
          reminderTime = ?, 
          description = ?, 
          category_id = ?
      WHERE reminderID = ?
    `;
  
    db.query(sql, [title, time, description, categoryId, id], (err, result) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Failed to update reminder' });
      }
  
      res.json({ success: true, message: 'Reminder updated successfully!' });
    });
  });
  

  router.get("/categories", async (req, res) => {
    const userID = req.session.userId;
  
    if (!userID) {
        return res.status(401).send('Unauthorized');
      }
  
    const categoryQuery = `SELECT id, name, color FROM categories WHERE user_id = ?`;
  
    try {
      const categories = await new Promise((resolve, reject) => {
        db.query(categoryQuery, [userID], (err, results) => {
          if (err) return reject(err);
          resolve(results);
        });
      });
  
      res.render("categories.ejs", { categories });
  
    } catch (err) {
      console.error("Error fetching categories:", err);
      res.status(500).send("Internal Server Error");
    }
  });
  
  router.post('/add-category', (req, res) => {
    const userID = req.session.userId;
    const { categoryName, categoryColor } = req.body;
  
    if (!userID) {
      return res.status(401).send('Unauthorized');
    }
  
    const sql = 'INSERT INTO categories (user_id, name, color) VALUES (?, ?, ?)';
    db.query(sql, [userID, categoryName, categoryColor], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Error adding category');
      }
      res.redirect('back');
    });
  });
  

  // DELETE CATEGORY
  router.post('/delete-category/:id', (req, res) => {
    const categoryId = req.params.id;
  
    db.query('DELETE FROM categories WHERE id = ?', [categoryId], (err, result) => {
      if (err) {
        console.error('Error deleting category:', err);
        return res.status(500).send('Internal Server Error');
      }
      res.redirect('/api/categories');
    });
  });
  

  router.post('/edit-category/:id', (req, res) => {
    const categoryId = req.params.id;
    const { categoryName, categoryColor } = req.body;
  
    db.query(
      'UPDATE categories SET name = ?, color = ? WHERE id = ?',
      [categoryName, categoryColor, categoryId],
      (err, result) => {
        if (err) {
          console.error('Error editing category:', err);
          return res.status(500).send('Internal Server Error');
        }
        res.redirect('/api/categories');
      }
    );
  });

module.exports = router;

  
