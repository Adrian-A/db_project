-- ============================================================
-- Life Insurance Policy and Mortality Analysis Database
-- Deliverable 5 - Complete DDL and DML
-- ============================================================

-- ============================================================
-- DDL: CREATE TABLES
-- ============================================================
DROP DATABASE IF EXISTS life_insurance;
CREATE DATABASE life_insurance;
USE life_insurance;
-- Drop tables in reverse dependency order to avoid FK conflicts
DROP TABLE IF EXISTS MortalityRateUltimate;
DROP TABLE IF EXISTS Claim;
DROP TABLE IF EXISTS Beneficiary;
DROP TABLE IF EXISTS Policy;
DROP TABLE IF EXISTS Policyholder;
DROP TABLE IF EXISTS UnderwritingClass;
DROP TABLE IF EXISTS PolicyStatus;
DROP TABLE IF EXISTS MortalityBasis;

-- ------------------------------------------------------------
-- Lookup / Reference Tables
-- ------------------------------------------------------------

CREATE TABLE UnderwritingClass (
    class_id    INT             NOT NULL,
    class_name  VARCHAR(100)    NOT NULL,
    description TEXT,
    CONSTRAINT pk_underwritingclass PRIMARY KEY (class_id)
);

CREATE TABLE PolicyStatus (
    status_id   INT             NOT NULL,
    status_name VARCHAR(50)     NOT NULL,
    CONSTRAINT pk_policystatus PRIMARY KEY (status_id)
);

CREATE TABLE MortalityBasis (
    basis_id    INT             NOT NULL,
    basis_name  VARCHAR(100)    NOT NULL,
    description TEXT,
    source      VARCHAR(100),
    CONSTRAINT pk_mortalitybasis PRIMARY KEY (basis_id)
);

-- ------------------------------------------------------------
-- Core Entity Tables
-- ------------------------------------------------------------

CREATE TABLE Policyholder (
    policyholder_id INT             NOT NULL,
    first_name      VARCHAR(100)    NOT NULL,
    last_name       VARCHAR(100)    NOT NULL,
    date_of_birth   DATE            NOT NULL,
    sex             CHAR(1)         NOT NULL,
    CONSTRAINT pk_policyholder PRIMARY KEY (policyholder_id),
    CONSTRAINT chk_policyholder_sex CHECK (sex IN ('M', 'F'))
);

CREATE TABLE Policy (
    policy_id       INT             NOT NULL,
    policyholder_id INT             NOT NULL,
    issue_date      DATE            NOT NULL,
    issue_age       INT             NOT NULL,
    face_amount     DECIMAL(15,2)   NOT NULL,
    class_id        INT             NOT NULL,
    status_id       INT             NOT NULL,
    basis_id        INT             NOT NULL,
    CONSTRAINT pk_policy PRIMARY KEY (policy_id),
    CONSTRAINT fk_policy_policyholder  FOREIGN KEY (policyholder_id) REFERENCES Policyholder(policyholder_id),
    CONSTRAINT fk_policy_class         FOREIGN KEY (class_id)        REFERENCES UnderwritingClass(class_id),
    CONSTRAINT fk_policy_status        FOREIGN KEY (status_id)       REFERENCES PolicyStatus(status_id),
    CONSTRAINT fk_policy_basis         FOREIGN KEY (basis_id)        REFERENCES MortalityBasis(basis_id),
    CONSTRAINT chk_policy_issue_age    CHECK (issue_age >= 0),
    CONSTRAINT chk_policy_face_amount  CHECK (face_amount > 0)
);

CREATE TABLE Beneficiary (
    beneficiary_id   INT             NOT NULL,
    policy_id        INT             NOT NULL,
    first_name       VARCHAR(100)    NOT NULL,
    last_name        VARCHAR(100)    NOT NULL,
    relationship     VARCHAR(50)     NOT NULL,
    percentage_share DECIMAL(5,2)    NOT NULL,
    CONSTRAINT pk_beneficiary PRIMARY KEY (beneficiary_id),
    CONSTRAINT fk_beneficiary_policy   FOREIGN KEY (policy_id) REFERENCES Policy(policy_id),
    CONSTRAINT chk_beneficiary_pct     CHECK (percentage_share > 0 AND percentage_share <= 100)
);

CREATE TABLE Claim (
    claim_id     INT             NOT NULL,
    policy_id    INT             NOT NULL,
    date_of_death DATE           NOT NULL,
    claim_amount  DECIMAL(15,2)  NOT NULL,
    claim_status  VARCHAR(50)    NOT NULL,
    CONSTRAINT pk_claim PRIMARY KEY (claim_id),
    CONSTRAINT fk_claim_policy   FOREIGN KEY (policy_id) REFERENCES Policy(policy_id),
    CONSTRAINT chk_claim_amount  CHECK (claim_amount > 0)
);

CREATE TABLE MortalityRateUltimate (
    basis_id    INT             NOT NULL,
    sex         CHAR(1)         NOT NULL,
    attained_age INT            NOT NULL,
    qx          DECIMAL(10,8)   NOT NULL,
    CONSTRAINT pk_mortalityrate PRIMARY KEY (basis_id, sex, attained_age),
    CONSTRAINT fk_mortalityrate_basis FOREIGN KEY (basis_id) REFERENCES MortalityBasis(basis_id),
    CONSTRAINT chk_mortalityrate_sex  CHECK (sex IN ('M', 'F')),
    CONSTRAINT chk_mortalityrate_age  CHECK (attained_age >= 0),
    CONSTRAINT chk_mortalityrate_qx   CHECK (qx >= 0 AND qx <= 1)
);


-- ============================================================
-- DML: INSERT SAMPLE DATA
-- ============================================================

-- ------------------------------------------------------------
-- UnderwritingClass  (5 rows)
-- ------------------------------------------------------------
INSERT INTO UnderwritingClass (class_id, class_name, description) VALUES
(1, 'Preferred Plus',  'Best risk class; non-smoker with excellent health history and lab results'),
(2, 'Preferred',       'Non-smoker with very good health; minor medical history acceptable'),
(3, 'Standard Plus',   'Non-smoker with good health; slightly elevated risk factors'),
(4, 'Standard',        'Average mortality risk; may have moderate health issues'),
(5, 'Substandard',     'Higher-than-average mortality risk; significant health impairments');

-- ------------------------------------------------------------
-- PolicyStatus  (5 rows)
-- ------------------------------------------------------------
INSERT INTO PolicyStatus (status_id, status_name) VALUES
(1, 'Active'),
(2, 'Lapsed'),
(3, 'Terminated due to Death'),
(4, 'Surrendered'),
(5, 'Pending');

-- ------------------------------------------------------------
-- MortalityBasis  (5 rows)
-- ------------------------------------------------------------
INSERT INTO MortalityBasis (basis_id, basis_name, description, source) VALUES
(1, '2017 CSO Ultimate Composite',
   'Unloaded 2017 Commissioner Standard Ordinary ultimate mortality table, composite sex',
   'Society of Actuaries'),
(2, '2017 CSO Ultimate Male',
   'Unloaded 2017 CSO ultimate mortality rates for males',
   'Society of Actuaries'),
(3, '2017 CSO Ultimate Female',
   'Unloaded 2017 CSO ultimate mortality rates for females',
   'Society of Actuaries'),
(4, '2001 CSO Ultimate',
   '2001 Commissioner Standard Ordinary ultimate mortality table',
   'Society of Actuaries'),
(5, '1980 CSO',
   '1980 Commissioner Standard Ordinary mortality table',
   'National Association of Insurance Commissioners');

-- ------------------------------------------------------------
-- Policyholder  (10 rows)
-- ------------------------------------------------------------
INSERT INTO Policyholder (policyholder_id, first_name, last_name, date_of_birth, sex) VALUES
(1,  'James',    'Harrison',   '1975-03-14', 'M'),
(2,  'Linda',    'Nguyen',     '1982-07-22', 'F'),
(3,  'Robert',   'Patel',      '1968-11-05', 'M'),
(4,  'Maria',    'Gonzalez',   '1990-01-30', 'F'),
(5,  'William',  'Chen',       '1955-09-18', 'M'),
(6,  'Patricia', 'Okafor',     '1978-06-03', 'F'),
(7,  'Michael',  'Thompson',   '1963-12-27', 'M'),
(8,  'Susan',    'Kim',        '1988-04-11', 'F'),
(9,  'David',    'Martinez',   '1950-08-09', 'M'),
(10, 'Jennifer', 'Williams',   '1995-02-17', 'F');

-- ------------------------------------------------------------
-- Policy  (10 rows)
-- ------------------------------------------------------------
INSERT INTO Policy (policy_id, policyholder_id, issue_date, issue_age, face_amount, class_id, status_id, basis_id) VALUES
(1001, 1,  '2010-06-01', 35, 500000.00,  1, 1, 2),
(1002, 2,  '2015-03-15', 33, 250000.00,  2, 1, 3),
(1003, 3,  '2005-09-20', 37, 750000.00,  3, 3, 2),
(1004, 4,  '2020-01-10', 30, 300000.00,  1, 1, 3),
(1005, 5,  '2000-11-01', 45, 1000000.00, 4, 2, 2),
(1006, 6,  '2012-07-22', 34, 400000.00,  2, 1, 3),
(1007, 7,  '2008-04-05', 45, 600000.00,  3, 1, 2),
(1008, 8,  '2018-10-30', 30, 200000.00,  1, 4, 3),
(1009, 9,  '1998-02-14', 48, 850000.00,  5, 3, 2),
(1010, 10, '2022-05-19', 27, 150000.00,  2, 1, 3);

-- ------------------------------------------------------------
-- Beneficiary  (12 rows — multiple per some policies)
-- ------------------------------------------------------------
INSERT INTO Beneficiary (beneficiary_id, policy_id, first_name, last_name, relationship, percentage_share) VALUES
(1,  1001, 'Sarah',   'Harrison',  'Spouse',  100.00),
(2,  1002, 'Thomas',  'Nguyen',    'Spouse',   60.00),
(3,  1002, 'Emily',   'Nguyen',    'Child',    40.00),
(4,  1003, 'Clara',   'Patel',     'Spouse',   50.00),
(5,  1003, 'Raj',     'Patel',     'Child',    50.00),
(6,  1004, 'Carlos',  'Gonzalez',  'Sibling',  100.00),
(7,  1005, 'Dorothy', 'Chen',      'Spouse',   70.00),
(8,  1005, 'Kevin',   'Chen',      'Child',    30.00),
(9,  1006, 'Emeka',   'Okafor',    'Spouse',  100.00),
(10, 1007, 'Anna',    'Thompson',  'Spouse',   80.00),
(11, 1007, 'Luke',    'Thompson',  'Child',    20.00),
(12, 1008, 'Grace',   'Kim',       'Parent',  100.00);

-- ------------------------------------------------------------
-- Claim  (5 rows — for policies with status 'Terminated due to Death')
-- ------------------------------------------------------------
INSERT INTO Claim (claim_id, policy_id, date_of_death, claim_amount, claim_status) VALUES
(2001, 1003, '2021-03-12', 750000.00, 'Paid'),
(2002, 1009, '2019-11-28', 850000.00, 'Paid'),
(2003, 1003, '2021-03-12', 750000.00, 'Approved'),   -- illustrative duplicate for testing
(2004, 1009, '2019-11-28', 850000.00, 'Approved'),
(2005, 1005, '2023-07-04', 1000000.00,'Pending');

-- Note: Claim 2003/2004 rows illustrate different claim_status values on the same
-- underlying event for testing query logic; in a production system a unique
-- constraint on policy_id might be enforced at the application layer.

-- ------------------------------------------------------------
-- MortalityRateUltimate
-- 2017 CSO Ultimate rates (qx) for basis_id = 2 (Male) and 3 (Female)
-- Sample ages 30-39 shown; production table would cover ages 0-120
-- ------------------------------------------------------------

-- Male rates (basis_id = 2)
INSERT INTO MortalityRateUltimate (basis_id, sex, attained_age, qx) VALUES
(2, 'M', 30, 0.00083000),
(2, 'M', 31, 0.00089000),
(2, 'M', 32, 0.00096000),
(2, 'M', 33, 0.00104000),
(2, 'M', 34, 0.00112000),
(2, 'M', 35, 0.00121000),
(2, 'M', 36, 0.00131000),
(2, 'M', 37, 0.00142000),
(2, 'M', 38, 0.00154000),
(2, 'M', 39, 0.00167000),
(2, 'M', 40, 0.00182000),
(2, 'M', 45, 0.00281000),
(2, 'M', 50, 0.00453000),
(2, 'M', 55, 0.00732000),
(2, 'M', 60, 0.01196000),
(2, 'M', 65, 0.01935000),
(2, 'M', 70, 0.03088000),
(2, 'M', 75, 0.04890000),
(2, 'M', 80, 0.07650000),
(2, 'M', 85, 0.11780000);

-- Female rates (basis_id = 3)
INSERT INTO MortalityRateUltimate (basis_id, sex, attained_age, qx) VALUES
(3, 'F', 30, 0.00038000),
(3, 'F', 31, 0.00041000),
(3, 'F', 32, 0.00044000),
(3, 'F', 33, 0.00047000),
(3, 'F', 34, 0.00051000),
(3, 'F', 35, 0.00055000),
(3, 'F', 36, 0.00059000),
(3, 'F', 37, 0.00064000),
(3, 'F', 38, 0.00069000),
(3, 'F', 39, 0.00075000),
(3, 'F', 40, 0.00082000),
(3, 'F', 45, 0.00140000),
(3, 'F', 50, 0.00244000),
(3, 'F', 55, 0.00418000),
(3, 'F', 60, 0.00703000),
(3, 'F', 65, 0.01156000),
(3, 'F', 70, 0.01873000),
(3, 'F', 75, 0.02990000),
(3, 'F', 80, 0.04780000),
(3, 'F', 85, 0.07560000);


-- ============================================================
-- TRIGGERS
-- ============================================================

-- ------------------------------------------------------------
-- Trigger 1: When a claim is inserted with status 'Paid',
-- automatically set the associated policy status to
-- 'Terminated due to Death' (status_id = 3).
-- ------------------------------------------------------------
DELIMITER $$
CREATE TRIGGER trg_claim_paid_close_policy
AFTER INSERT ON Claim
FOR EACH ROW
BEGIN
    IF NEW.claim_status = 'Paid' THEN
        UPDATE Policy
        SET status_id = 3
        WHERE policy_id = NEW.policy_id;
    END IF;
END$$
DELIMITER ;

-- ------------------------------------------------------------
-- Trigger 2: Before inserting a new beneficiary, verify that
-- the sum of percentage_share for that policy does not exceed
-- 100%. Raises an error if the new row would push it over.
-- ------------------------------------------------------------
DELIMITER $$
CREATE TRIGGER trg_beneficiary_pct_check
BEFORE INSERT ON Beneficiary
FOR EACH ROW
BEGIN
    DECLARE current_total DECIMAL(5,2);

    SELECT COALESCE(SUM(percentage_share), 0)
    INTO   current_total
    FROM   Beneficiary
    WHERE  policy_id = NEW.policy_id;

    IF current_total + NEW.percentage_share > 100.00 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Total beneficiary percentage share for this policy cannot exceed 100%.';
    END IF;
END$$
DELIMITER ;

-- ------------------------------------------------------------
-- Trigger 3: Before deleting a policy, block the deletion if
-- any claim tied to that policy is still Pending or Approved.
-- This prevents removing a policy while a live claim exists.
-- ------------------------------------------------------------
DELIMITER $$
CREATE TRIGGER trg_block_policy_delete_with_open_claims
BEFORE DELETE ON Policy
FOR EACH ROW
BEGIN
    DECLARE open_claims INT;

    SELECT COUNT(*)
    INTO   open_claims
    FROM   Claim
    WHERE  policy_id    = OLD.policy_id
      AND  claim_status IN ('Pending', 'Approved');

    IF open_claims > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Cannot delete a policy that has pending or approved claims.';
    END IF;
END$$
DELIMITER ;


-- -----------------------------------------------------------
-- Views
-- -----------------------------------------------------------

-- View 1: Policy summary with the policyholder, class, status, and mortality basis
CREATE VIEW view_policy_summary AS
SELECT
	p.policy_id,
    ph.policyholder_id,
    CONCAT(ph.first_name, ' ', ph.last_name)AS policyholder_name,
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
JOiN PolicyStatus ps ON p.status_id = ps.status_id
JOIN MortalityBasis mb ON p.basis_id = mb.basis_id;

-- View 2: Beneficiary payout amounts by policy
CREATE VIEW view_beneficiary_payouts AS
SELECT
	b.beneficiary_id,
    b.policy_id,
    CONCAT(b.first_name, ' ', b.last_name) AS beneficiary_name,
    b.relationship,
    b.percentage_share,
    p.face_amount,
    ROUND(p.face_amount * (b.percentage_share / 100), 2) AS estimated_payout -- rounding the amount to cents
FROM Beneficiary b
JOIN Policy p ON b.policy_id = p.policy_id;


-- ===================================================
-- 5 SQL Queries
-- ===================================================

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

-- ===============================
-- Stored Procedure and Function... 
-- this procedure and function make it easy for future business purposes if a certain way of calculating something or retrieving something were to be changed, it can be done easily in one place which is then reflected in all future calls.
-- ===============================


-- Procedure to get all the policies based on what status they are at
-- for example: Call get_policies_by_status('Active') to get the active policies
-- this uses a view which helps simplify the code using already written code rather than rewriting all the joins
DELIMITER $$

CREATE PROCEDURE get_policies_by_status(IN input_status_name VARCHAR(50))
BEGIN
	SELECT
		policy_id, policyholder_name, sex, issue_date, issue_age, face_amount, class_name, status_name, basis_name
	FROM view_policy_summary
    WHERE status_name = input_status_name
    ORDER BY face_amount DESC; -- descending from largest to smallest policy
    
END $$
DELIMITER ;





-- Function: calculates the estimated payout for a beneficiary
-- For example: SELECT calculate_beneficiary_payout(500000.00, 60.00); would return 300000
-- it takes the face amount and the percentage share and then returns the actual amount to be paid out

DELIMITER $$

CREATE FUNCTION calculate_beneficiary_payout(
	input_face_amount DECIMAL(15,2),
    input_percentage_share DECIMAL(5,2)
    ) RETURNS DECIMAL(15,2)
    DETERMINISTIC
BEGIN
	RETURN ROUND(input_face_amount * (input_percentage_share / 100), 2);
END $$

DELIMITER ;
