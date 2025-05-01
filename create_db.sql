
# Create the app user
CREATE USER IF NOT EXISTS 'appuser'@'localhost' IDENTIFIED BY 'qwertyuiop'; 
GRANT ALL PRIVILEGES ON bettys_books.* TO ' appuser'@'localhost';
# Insert data into the tables

USE bettys_books;
CREATE TABLE teams (
    teamID INT PRIMARY KEY,
    teamName VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE Users (
    userId INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    teamID INT DEFAULT NULL,
    FOREIGN KEY (teamID) REFERENCES teams(teamID)
);

CREATE TABLE matches (
    matchID INT AUTO_INCREMENT PRIMARY KEY,
    teamID INT NOT NULL,
    matchNum INT NOT NULL,
    competition VARCHAR(255) NOT NULL,
    opponent VARCHAR(255) NOT NULL,
    matchDate VARCHAR(10) NOT NULL,  
    matchTime TIME NOT NULL,
    FOREIGN KEY (teamID) REFERENCES teams(teamID)
);


CREATE TABLE Reminders (
    reminderID INT AUTO_INCREMENT PRIMARY KEY,
    userID INT NOT NULL,
    reminderTitle VARCHAR(255) NOT NULL,
    reminderDate VARCHAR(10) NOT NULL,
    reminderTime TIME NOT NULL,
    category_id INT DEFAULT NULL,
    description TEXT,
    isSystemGenerated BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (userID) REFERENCES Users(userId),
    FOREIGN KEY (category_id) REFERENCES Categories(id)
);

CREATE TABLE Categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    color VARCHAR(20) DEFAULT 'yellow',
    FOREIGN KEY (user_id) REFERENCES Users(userId)
);


SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE Reminders;
TRUNCATE TABLE Users;
TRUNCATE TABLE matches;
TRUNCATE TABLE teams;

SET FOREIGN_KEY_CHECKS = 1;


SELECT * FROM Users;
SELECT * FROM teams;
SELECT * FROM matches;
SELECT * FROM Reminders;