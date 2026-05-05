-- Commands for showing the tables
SELECT * FROM beneficiary;
SELECT * FROM claim;
SELECT * FROM mortalitybasis;
SELECT * FROM mortalityrateultimate;
SELECT * FROM policy;
SELECT * FROM policyholder;
SELECT * FROM policystatus;
SELECT * FROM underwritingclass;

-- Commands for showing the views
SELECT * FROM view_beneficiary_payouts;
SELECT * FROM view_policy_summary;

-- Commands for showing the 5 queries
-- Query 1: Show all *ACTIVE* policies with policyholder, class, status, and mortality basis
-- Uses joins
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
FROM Policy p
JOIN Policyholder ph ON p.policyholder_id = ph.policyholder_id
JOIN UnderwritingClass uc ON p.class_id = uc.class_id
JOIN PolicyStatus ps ON p.status_id = ps.status_id
JOIN MortalityBasis mb ON p.basis_id = mb.basis_id
WHERE ps.status_name = 'Active';

-- Query 2: Calculate the total face amount by policy status (uses joins and aggregation)
SELECT
	ps.status_name,
    COUNT(p.policy_id) AS number_of_policies,
    SUM(p.face_amount) AS total_face_amount
FROM Policy p
JOIN PolicyStatus ps ON p.status_id = ps.status_id
GROUP BY ps.status_name;

-- Query 3: Show each policy and its total beneficiary percentage (uses joins and aggregation)
SELECT
	p.policy_id,
    CONCAT(ph.first_name, ' ', ph.last_name) AS policyholder_name,
    SUM(b.percentage_share) AS total_beneficiary_percentage
FROM Policy p
JOIN Policyholder ph ON p.policyholder_id = ph.policyholder_id
JOIN Beneficiary b ON p.policy_id = b.policy_id
GROUP BY p.policy_id, policyholder_name;


-- Query 4: Find the policies with above average face amounts for all policies (uses subquery)
SELECT
	policy_id,
    face_amount,
    issue_age
FROM Policy
WHERE face_amount > (
	SELECT AVG(face_amount)
    FROM Policy
);

-- Query 5: Show beneficiary estimated payouts of 100,000+ using view code, from largest to smallest order
SELECT
	policy_id,
    beneficiary_name,
    relationship,
    percentage_share,
    estimated_payout
FROM view_beneficiary_payouts
WHERE estimated_payout >= 100000
ORDER BY estimated_payout DESC;