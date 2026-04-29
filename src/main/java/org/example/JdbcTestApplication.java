package org.example; // Defines the namespace for your code so Java can find it.

// These imports bring in the Spring Boot and JDBC "tools" from the libraries Maven downloaded.
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.Map;

/**
 * @SpringBootApplication: This is a "magic" annotation. It tells Java this is a Spring Boot project.
 * It automatically configures things like your database connection based on your properties file.
 * * implements CommandLineRunner: This tells Spring, "As soon as the app starts, run the code
 * inside the 'run' method below."
 */
@SpringBootApplication
public class JdbcTestApplication implements CommandLineRunner {

    /**
     * @Autowired: This tells Spring to automatically create and "plug in" the JdbcTemplate object.
     * You don't have to say 'new JdbcTemplate()'; Spring handles it for you.
     * * JdbcTemplate: This is the core JDBC tool. It simplifies running SQL queries so you
     * don't have to write messy 'DriverManager' or 'Connection' code.
     */
    @Autowired
    private JdbcTemplate jdbcTemplate;

    // This is the standard starting point for any Java program.
    public static void main(String[] args) {
        // This line kicks off the entire Spring Boot framework.
        SpringApplication.run(JdbcTestApplication.class, args);
    }

    /**
     * The run method: Because we implemented 'CommandLineRunner', this code executes
     * immediately after the application starts. This is where we test our JDBC connection.
     */
    @Override
    public void run(String... args) throws Exception {
        System.out.println("--- SYSTEM STARTING ---");

        // 1. Define a simple SQL string.
        String sql = "SELECT COUNT(*) FROM beneficiary";

        /**
         * 2. Use the jdbcTemplate to execute the query.
         * .queryForObject: Used when you expect exactly one result back.
         * sql: The query to run.
         * Integer.class: Tells Java to convert the database result into a Java Integer.
         */
        Integer count = jdbcTemplate.queryForObject(sql, Integer.class);

        // 3. Print the results to the IntelliJ console to verify everything works.
        System.out.println("--- CONNECTION SUCCESSFUL ---");
        System.out.println("Number of users found in the 'beneficiary' table: " + count);




        System.out.println("--- FETCHING ALL USERS ---");

        // 1. Define the SQL query to get everything
        String sql1 = "SELECT * FROM beneficiary";

        /**
         * 2. queryForList returns a List of Maps.
         * Each 'Map' in the list represents ONE row in the database.
         * The 'Key' is the Column Name (e.g., "username")
         * The 'Value' is the actual data (e.g., "adrian")
         */
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql1);

        // 3. Loop through the list to print each user's info
        for (Map<String, Object> row : rows) {
            // We use the column names from your test.sql file as the keys
            Object benID = row.get("beneficiary_id");
            Object polID = row.get("policy_id");
            Object first = row.get("first_name");
            Object last = row.get("last_name");
            Object rel = row.get("relationship");
            Object pct = row.get("percentage_share");

            System.out.println(benID + " " + polID + " " + first + " " + last + " " + rel + " " + pct);
        }

        System.out.println("--- END OF LIST ---");
    }
}