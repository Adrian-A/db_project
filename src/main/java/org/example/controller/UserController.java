package org.example.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Controller // Tells Spring this class handles web requests
public class UserController {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    // This handles the display of the beneficiaries (Read operation)
    @GetMapping("/")
    public String showBeneficiaries(
            Model model,
            @RequestParam(required = false) Integer editId) {
        List<Map<String, Object>> beneficiaries =
                queryForMapList("SELECT * FROM beneficiary ORDER BY beneficiary_id");
        model.addAttribute("beneficiaries", beneficiaries);

        if (editId != null) {
            List<Map<String, Object>> one =
                    queryForMapList("SELECT * FROM beneficiary WHERE beneficiary_id = ?", editId);
            if (!one.isEmpty()) {
                model.addAttribute("editBeneficiary", one.get(0));
            }
        }
        return "index";
    }

    // This handles the form submission (Create operation)
    @PostMapping("/add")
    public String addBeneficiary(
            @RequestParam Integer benID,
            @RequestParam Integer polID,
            @RequestParam String first,
            @RequestParam String last,
            @RequestParam String rel,
            @RequestParam BigDecimal pct,
            RedirectAttributes redirectAttributes) {
        String sql = "INSERT INTO beneficiary (beneficiary_id, policy_id, first_name, last_name, relationship, "
                + "percentage_share) VALUES (?, ?, ?, ?, ?, ?)";
        try {
            jdbcTemplate.update(sql, benID, polID, first, last, rel, pct);
            redirectAttributes.addFlashAttribute("success", "Beneficiary added.");
        } catch (DataAccessException e) {
            redirectAttributes.addFlashAttribute("error", extractDbMessage(e));
        }
        return "redirect:/";
    }

    @PostMapping("/update")
    public String updateBeneficiary(
            @RequestParam Integer beneficiaryId,
            @RequestParam Integer polID,
            @RequestParam String first,
            @RequestParam String last,
            @RequestParam String rel,
            @RequestParam BigDecimal pct,
            RedirectAttributes redirectAttributes) {
        String sql = "UPDATE beneficiary SET policy_id = ?, first_name = ?, last_name = ?, relationship = ?, "
                + "percentage_share = ? WHERE beneficiary_id = ?";
        try {
            int n = jdbcTemplate.update(sql, polID, first, last, rel, pct, beneficiaryId);
            if (n == 0) {
                redirectAttributes.addFlashAttribute("error", "No beneficiary found with that ID.");
            } else {
                redirectAttributes.addFlashAttribute("success", "Beneficiary updated.");
            }
        } catch (DataAccessException e) {
            redirectAttributes.addFlashAttribute("error", extractDbMessage(e));
        }
        return "redirect:/";
    }

    @PostMapping("/delete")
    public String deleteBeneficiary(
            @RequestParam Integer beneficiaryId,
            RedirectAttributes redirectAttributes) {
        try {
            int n = jdbcTemplate.update("DELETE FROM beneficiary WHERE beneficiary_id = ?", beneficiaryId);
            if (n == 0) {
                redirectAttributes.addFlashAttribute("error", "No beneficiary found with that ID.");
            } else {
                redirectAttributes.addFlashAttribute("success", "Beneficiary deleted.");
            }
        } catch (DataAccessException e) {
            redirectAttributes.addFlashAttribute("error", extractDbMessage(e));
        }
        return "redirect:/";
    }

    @GetMapping("/queries")
    public String showQueries(Model model) {
        model.addAttribute("query1ActivePolicies", queryForMapList(
                """
                        SELECT
                            p.policy_id,
                            CONCAT(ph.first_name, ' ', ph.last_name) AS policyholder_name,
                            ph.sex,
                            p.issue_date,
                            p.issue_age,
                            p.face_amount,
                            uc.class_name,
                            ps.status_name,
                            mb.basis_name
                        FROM policy p
                        JOIN policyholder ph ON p.policyholder_id = ph.policyholder_id
                        JOIN underwritingclass uc ON p.class_id = uc.class_id
                        JOIN policystatus ps ON p.status_id = ps.status_id
                        JOIN mortalitybasis mb ON p.basis_id = mb.basis_id
                        WHERE ps.status_name = 'Active'
                        """));

        model.addAttribute("query2FaceByStatus", queryForMapList(
                """
                        SELECT
                            ps.status_name,
                            COUNT(p.policy_id) AS number_of_policies,
                            SUM(p.face_amount) AS total_face_amount
                        FROM policy p
                        JOIN policystatus ps ON p.status_id = ps.status_id
                        GROUP BY ps.status_name
                        """));

        model.addAttribute("query3BeneficiaryTotals", queryForMapList(
                """
                        SELECT
                            p.policy_id,
                            CONCAT(ph.first_name, ' ', ph.last_name) AS policyholder_name,
                            SUM(b.percentage_share) AS total_beneficiary_percentage
                        FROM policy p
                        JOIN policyholder ph ON p.policyholder_id = ph.policyholder_id
                        JOIN beneficiary b ON p.policy_id = b.policy_id
                        GROUP BY p.policy_id, policyholder_name
                        """));

        model.addAttribute("query4AboveAvgFace", queryForMapList(
                """
                        SELECT
                            policy_id,
                            face_amount,
                            issue_age
                        FROM policy
                        WHERE face_amount > (
                            SELECT AVG(face_amount)
                            FROM policy
                        )
                        """));

        model.addAttribute("query5LargePayouts", queryForMapList(
                """
                        SELECT
                            policy_id,
                            beneficiary_name,
                            relationship,
                            percentage_share,
                            estimated_payout
                        FROM view_beneficiary_payouts
                        WHERE estimated_payout >= 100000
                        ORDER BY estimated_payout DESC
                        """));

        return "queries";
    }

    /**
     * Maps each column label to lowercase so Thymeleaf paths like {@code ben.beneficiary_id} match
     * MySQL ResultSetMetaData (labels may be uppercase depending on driver/settings).
     */
    private List<Map<String, Object>> queryForMapList(String sql, Object... args) {
        RowMapper<Map<String, Object>> mapper = (ResultSet rs, int rowNum) -> {
            var md = rs.getMetaData();
            int cols = md.getColumnCount();
            Map<String, Object> row = new LinkedHashMap<>();
            for (int i = 1; i <= cols; i++) {
                row.put(md.getColumnLabel(i).toLowerCase(Locale.ROOT), rs.getObject(i));
            }
            return row;
        };
        if (args == null || args.length == 0) {
            return jdbcTemplate.query(sql, mapper);
        }
        return jdbcTemplate.query(sql, mapper, args);
    }

    private static String extractDbMessage(DataAccessException e) {
        Throwable root = e.getMostSpecificCause();
        String msg = root != null ? root.getMessage() : null;
        if (msg == null || msg.isBlank()) {
            msg = e.getMessage();
        }
        return msg != null ? msg : "Database error.";
    }
}
