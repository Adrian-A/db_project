# Project Information

This project is designed to interact with a MySQL database using mysql2. Please follow these steps to get your local environment synced with the repository.

## 1. Clone the repository

```bash
git clone https://github.com/Adrian-A/db_project.git
cd db_project
```

## 2. Local Database Configuration
Before running the application, you must set up your local database:
1. Open **MySQL Workbench**.
2. Create a schema called life_insurance and set that as your default schema
3. Run the `lifeinsurancedb.sql` script provided in the root of this repository. This will create all the tables, insert initial test data, make triggers, etc.


## 3. Configure backend environment

Create `backend/.env`:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=YOUR_PASSWORD
DB_NAME=life_insurance
DB_PORT=3306
PORT=5000
```

## 4. Install dependencies

Backend:

```bash
cd backend
npm install
```

Frontend:

```bash
cd ../frontend
npm install
```

## 5. Run the app
Start backend (Terminal 1):
```bash
cd backend
npm start
```
Start frontend (Terminal 2):
```bash
cd frontend
npm run dev
```
Open the Vite URL shown in terminal (typically `http://localhost:5173`).

## 6. Login
Use a username/password from the `users` table in `lifeinsurancedb.sql`.
Example test account from the seed data:
- Username: `Adrian`
- Password: `123456`


## 7. Git Commands
**Always run `git pull` first** before making any changes. This ensures your local copy is up to date and helps avoid merge conflicts.

```bash
git pull origin main
git add .
git commit -m "your message here"
git push origin main
```
