package org.example.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.net.Inet4Address;
import java.util.List;
import java.util.Map;

@Controller // Tells Spring this class handles web requests
public class UserController {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    // This handles the main page (Read operation)
    @GetMapping("/")
    public String showBeneficiaries(Model model) {
        String sql = "SELECT * FROM beneficiary";
        List<Map<String, Object>> beneficiaries = jdbcTemplate.queryForList(sql);

        // This makes the 'beneficiaries' list available to the HTML file
        model.addAttribute("beneficiaries", beneficiaries);
        return "index"; // Looks for index.html in the templates folder
    }

    // This handles the form submission (Create operation)
    @PostMapping("/add")
    public String addBeneficiary(@RequestParam Integer benID, @RequestParam Integer polID, @RequestParam String first,
                                 @RequestParam String last, @RequestParam String rel, @RequestParam Integer pct) {
        String sql = "INSERT INTO beneficiary (beneficiary_id, policy_id, first_name, last_name, relationship, " +
                "percentage_share) VALUES (?, ?, ?, ?, ?, ?)";
        jdbcTemplate.update(sql, benID, polID, first, last, rel, pct);
        return "redirect:/"; // Reloads the page to show the new user
    }
}