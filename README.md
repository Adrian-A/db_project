# Project Information

This project is a Spring Boot application designed to interact with a MySQL database using JDBC. Please follow these steps to get your local environment synced with the repository.

## 1. IntelliJ Cloning steps
1. Open IntelliJ
2. Press Clone Repository
3. Go to GitHub and get the clone URL, located under <> code. Paste it into the URL field in IntelliJ and press clone

## 2. Local Database Configuration
Before running the application, you must set up your local database:
1. Open **MySQL Workbench**.
2. Create a schema called life_insurance and set that as your default schema
3. Run the `lifeinsurancedb.sql` script provided in the root of this repository. This will create all the tables and insert initial test data.

## 3. Project Configuration
The `application.properties` file is **ignored by Git** for security. You must create it manually:
1. Navigate to `src/main/resources/`.
2. Create a new file named `application.properties`.
3. Paste the following and update with your local MySQL credentials:

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/life_insurance
spring.datasource.username=root
spring.datasource.password=YOUR_PASSWORD_HERE
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver
```

## 4. Git Commands
**Always run `git pull` first** before making any changes. This ensures your local copy is up to date and helps avoid merge conflicts.

```bash
git pull origin main
git add .
git commit -m "your message here"
git push origin main
```

## 5. Running Webpage
1. Run JdbcTestApplication.java
2. Enter http://localhost:8080/ into a browser

