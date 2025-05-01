```bash
Getting Started

Follow these steps to set up the project on your local machine and test it:

1. Clone the Repository

Clone the repository to your local machine using Git:

git clone https://github.com/AmmarNaz1r/GamePlan.git

#############################################################################################

2.Install Dependencies
Navigate to the project folder and install the required Node.js dependencies:

cd GamePlan # or what ever the folder is called
npm install
npm install brcrypt

#############################################################################################

3. Set Up the Database
You need a MySQL database to run the application. Follow these steps to set it up:

Install MySQL if it's not already installed. You can download it from MySQL Downloads.

Run the SQL commands in the create_db.sql file to create the necessary tables:

mysql -u root -p < create_db.sql # or just copy the code and paste into a query in mySQL workbench and run it

#############################################################################################

4. All done, in the terminal just pase node index.js and go to localhost:8000/api to test the website.