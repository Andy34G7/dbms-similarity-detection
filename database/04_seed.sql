-- ============================================================================
-- Automated Test Evaluation & Vector Similarity System
-- Database: PostgreSQL 16 (with pgvector extension)
-- Rich Demo Seed Data: Teachers, Students, Tests, Questions & Submissions
-- Section / Team: PES2UG24CS058 & PES2UG24CS061
-- ============================================================================

-- -----------------------------------------------------------------------------
-- 1. Insert Teachers
-- -----------------------------------------------------------------------------
INSERT INTO TEACHER (teacher_id, name, email, dept_name)
VALUES 
    ('T101', 'Dr. Deena Hajim', 'deena.hajim@pes.edu', 'Computer Science'),
    ('T102', 'Prof. Nagasundari S', 'nagasundari@pes.edu', 'Computer Science')
ON CONFLICT (teacher_id) DO UPDATE 
SET name = EXCLUDED.name, email = EXCLUDED.email, dept_name = EXCLUDED.dept_name;

-- -----------------------------------------------------------------------------
-- 2. Insert Students
-- -----------------------------------------------------------------------------
INSERT INTO STUDENT (student_id, name, email)
VALUES 
    ('PES2UG24CS061', 'Hemanth Andey', 'hemanth.cs061@pes.edu'),
    ('PES2UG24CS058', 'Ananya Ratnaparkhi', 'ananya.cs058@pes.edu'),
    ('PES2UG24CS102', 'Ananya Sharma', 'ananya.cs102@pes.edu'),
    ('PES2UG24CS115', 'Vikram Patel', 'vikram.cs115@pes.edu'),
    ('REF_BENCHMARK', 'Benchmark Model Key', 'benchmark@pes.edu')
ON CONFLICT (student_id) DO UPDATE 
SET name = EXCLUDED.name, email = EXCLUDED.email;

-- -----------------------------------------------------------------------------
-- 3. Insert Tests
-- -----------------------------------------------------------------------------
INSERT INTO TEST (test_id, teacher_id, title, description)
VALUES 
    ('TEST_DBMS_01', 'T101', 'DBMS Midterm: Relational Modeling, Indexing & Transactions', 'Comprehensive evaluation of relational algebra, indexing internals, ACID properties, and normalization.'),
    ('TEST_DBMS_02', 'T102', 'Advanced DB Systems: Concurrency Control & Query Optimization', 'In-depth assessment covering serializability, 2PL, distributed transactions, and cost-based query execution plans.')
ON CONFLICT (test_id) DO UPDATE 
SET title = EXCLUDED.title, description = EXCLUDED.description;

-- -----------------------------------------------------------------------------
-- 4. Insert Questions for TEST_DBMS_01
-- -----------------------------------------------------------------------------
INSERT INTO QUESTION (question_id, test_id, question_text, marks, sample_solution)
VALUES 
    ('Q101', 'TEST_DBMS_01', 
     'Explain the ACID properties of relational transactions and their role in preserving data consistency.', 
     10.00,
     'ACID stands for Atomicity, Consistency, Isolation, and Durability. Atomicity ensures all operations in a transaction complete or none do (all-or-nothing). Consistency ensures the database transitions from one valid state to another, satisfying all integrity constraints. Isolation guarantees concurrent transactions execute without interfering with one another, preventing dirty reads and race conditions. Durability guarantees that once a transaction commits, its updates persist in non-volatile storage even after system crashes.'),

    ('Q102', 'TEST_DBMS_01', 
     'What is a B+ Tree index, and why is it preferred over a standard B-Tree for relational database range queries?', 
     10.00,
     'A B+ Tree is a self-balancing N-ary search tree used extensively in relational DBMS indexing. Unlike a standard B-Tree where keys and data records are stored in both internal and leaf nodes, a B+ Tree stores actual data pointers only in leaf nodes, with internal nodes storing only navigation keys. Furthermore, all leaf nodes in a B+ Tree are linked sequentially in a doubly-linked list. This makes range queries (such as BETWEEN or inequality scans) extremely efficient via linear leaf traversal without backtracking up the tree hierarchy.'),

    ('Q103', 'TEST_DBMS_01', 
     'Differentiate between Third Normal Form (3NF) and Boyce-Codd Normal Form (BCNF) in terms of functional dependencies.', 
     10.00,
     'A relation is in 3NF if for every non-trivial functional dependency X -> A, either X is a superkey or A is a prime attribute (part of a candidate key). BCNF is a stricter normal form requiring that for every non-trivial functional dependency X -> A, X must be a superkey, regardless of whether A is prime. Every relation in BCNF is in 3NF, but not every 3NF relation is in BCNF. BCNF eliminates all redundancy due to functional dependencies, though it may not always preserve functional dependencies upon decomposition.')
ON CONFLICT (question_id) DO UPDATE 
SET question_text = EXCLUDED.question_text, marks = EXCLUDED.marks, sample_solution = EXCLUDED.sample_solution;

-- -----------------------------------------------------------------------------
-- 5. Insert Submissions
-- -----------------------------------------------------------------------------
INSERT INTO SUBMISSION (submission_id, student_id, test_id, status, total_score)
VALUES 
    ('SUB_BENCH_TEST_DBMS_01', 'REF_BENCHMARK', 'TEST_DBMS_01', 'EVALUATED', 30.00),
    ('SUB_061_01', 'PES2UG24CS061', 'TEST_DBMS_01', 'SUBMITTED', 0.00),
    ('SUB_058_01', 'PES2UG24CS058', 'TEST_DBMS_01', 'SUBMITTED', 0.00),
    ('SUB_115_01', 'PES2UG24CS115', 'TEST_DBMS_01', 'SUBMITTED', 0.00),
    ('SUB_102_01', 'PES2UG24CS102', 'TEST_DBMS_01', 'SUBMITTED', 0.00)
ON CONFLICT (submission_id) DO UPDATE 
SET status = EXCLUDED.status;

-- -----------------------------------------------------------------------------
-- 6. Insert Answers (Benchmark Reference Answers + Diverse Student Answers)
-- -----------------------------------------------------------------------------

-- 6.1 Benchmark Model Answers
INSERT INTO ANSWER (answer_id, submission_id, question_id, answer_text, marks_awarded, is_reference)
VALUES 
    ('ANS_REF_Q101', 'SUB_BENCH_TEST_DBMS_01', 'Q101', 
     'ACID stands for Atomicity, Consistency, Isolation, and Durability. Atomicity ensures all operations in a transaction complete or none do (all-or-nothing). Consistency ensures the database transitions from one valid state to another, satisfying all integrity constraints. Isolation guarantees concurrent transactions execute without interfering with one another, preventing dirty reads and race conditions. Durability guarantees that once a transaction commits, its updates persist in non-volatile storage even after system crashes.', 
     10.00, TRUE),

    ('ANS_REF_Q102', 'SUB_BENCH_TEST_DBMS_01', 'Q102', 
     'A B+ Tree is a self-balancing N-ary search tree used extensively in relational DBMS indexing. Unlike a standard B-Tree where keys and data records are stored in both internal and leaf nodes, a B+ Tree stores actual data pointers only in leaf nodes, with internal nodes storing only navigation keys. Furthermore, all leaf nodes in a B+ Tree are linked sequentially in a doubly-linked list. This makes range queries (such as BETWEEN or inequality scans) extremely efficient via linear leaf traversal without backtracking up the tree hierarchy.', 
     10.00, TRUE),

    ('ANS_REF_Q103', 'SUB_BENCH_TEST_DBMS_01', 'Q103', 
     'A relation is in 3NF if for every non-trivial functional dependency X -> A, either X is a superkey or A is a prime attribute (part of a candidate key). BCNF is a stricter normal form requiring that for every non-trivial functional dependency X -> A, X must be a superkey, regardless of whether A is prime. Every relation in BCNF is in 3NF, but not every 3NF relation is in BCNF. BCNF eliminates all redundancy due to functional dependencies, though it may not always preserve functional dependencies upon decomposition.', 
     10.00, TRUE)
ON CONFLICT (answer_id) DO UPDATE 
SET answer_text = EXCLUDED.answer_text, marks_awarded = EXCLUDED.marks_awarded, is_reference = EXCLUDED.is_reference;

-- 6.2 Hemanth Andey (PES2UG24CS061) - High quality, accurate semantic paraphrasing
INSERT INTO ANSWER (answer_id, submission_id, question_id, answer_text, marks_awarded, is_reference)
VALUES 
    ('ANS_061_Q101', 'SUB_061_01', 'Q101', 
     'Transactions in relational DBMS adhere to ACID: Atomicity guarantees all-or-nothing execution of operations. Consistency maintains database rules and integrity constraints across transitions. Isolation isolates concurrent transactions from mutual interference, avoiding dirty reads. Durability guarantees that committed modifications survive power failures or system crashes.', 
     0.00, FALSE),

    ('ANS_061_Q102', 'SUB_061_01', 'Q102', 
     'In relational storage engines, B+ Trees store data records exclusively in the leaf nodes, while internal nodes store routing search keys. The leaf nodes are chained together in a linked list, enabling rapid sequential traversal for range scans without traversing internal node levels. In standard B-Trees, data is scattered across all nodes, making range queries slower.', 
     0.00, FALSE),

    ('ANS_061_Q103', 'SUB_061_01', 'Q103', 
     '3NF permits a dependency X -> Y if X is a superkey or Y is a prime attribute. BCNF removes the prime attribute exception and strictly requires X to be a superkey for every non-trivial dependency X -> Y. Therefore, BCNF is stricter and removes all functional dependency anomalies, but may sacrifice dependency preservation.', 
     0.00, FALSE)
ON CONFLICT (answer_id) DO UPDATE 
SET answer_text = EXCLUDED.answer_text;

-- 6.3 Ananya Ratnaparkhi (PES2UG24CS058) - Good answer, but colluded with Vikram Patel on Q101!
INSERT INTO ANSWER (answer_id, submission_id, question_id, answer_text, marks_awarded, is_reference)
VALUES 
    ('ANS_058_Q101', 'SUB_058_01', 'Q101', 
     'ACID properties govern database transactions: Atomicity means either everything executes or nothing does. Consistency ensures database integrity rules remain valid. Isolation ensures concurrent transactions do not interfere with each other. Durability means committed transactions are permanently stored and survive crashes.', 
     0.00, FALSE),

    ('ANS_058_Q102', 'SUB_058_01', 'Q102', 
     'B+ tree has keys and data only in leaf level and internal nodes only contain search router keys. Leaves are linked together in a list so range scan is very fast.', 
     0.00, FALSE),

    ('ANS_058_Q103', 'SUB_058_01', 'Q103', 
     '3NF allows transitive dependencies if attribute is prime, but BCNF strictly forces determinant to be a superkey.', 
     0.00, FALSE)
ON CONFLICT (answer_id) DO UPDATE 
SET answer_text = EXCLUDED.answer_text;

-- 6.4 Vikram Patel (PES2UG24CS115) - Pairwise Plagiarism Match with Ananya Ratnaparkhi on Q101
INSERT INTO ANSWER (answer_id, submission_id, question_id, answer_text, marks_awarded, is_reference)
VALUES 
    ('ANS_115_Q101', 'SUB_115_01', 'Q101', 
     'ACID properties govern database transactions: Atomicity means either everything executes or nothing does. Consistency ensures database integrity rules remain valid. Isolation ensures concurrent transactions do not interfere with each other. Durability means committed transactions are permanently stored and survive crashes.', 
     0.00, FALSE),

    ('ANS_115_Q102', 'SUB_115_01', 'Q102', 
     'B+ trees are tree structures used in databases where all data pointers live only in the bottom leaves and leaves are connected in a linked list.', 
     0.00, FALSE),

    ('ANS_115_Q103', 'SUB_115_01', 'Q103', 
     'In 3NF the right hand side can be a prime attribute. In BCNF every left hand side must be a superkey.', 
     0.00, FALSE)
ON CONFLICT (answer_id) DO UPDATE 
SET answer_text = EXCLUDED.answer_text;

-- 6.5 Ananya Sharma (PES2UG24CS102) - Partial and weak answers (Tests threshold auto-grading)
INSERT INTO ANSWER (answer_id, submission_id, question_id, answer_text, marks_awarded, is_reference)
VALUES 
    ('ANS_102_Q101', 'SUB_102_01', 'Q101', 
     'ACID is about atomicity and consistency. Atomicity means it runs completely. Durability means data is saved on hard drive.', 
     0.00, FALSE),

    ('ANS_102_Q102', 'SUB_102_01', 'Q102', 
     'B+ tree is an index tree. It is better than B-Tree because it has faster lookup times.', 
     0.00, FALSE),

    ('ANS_102_Q103', 'SUB_102_01', 'Q103', 
     'Normal forms are used to reduce duplicate data in SQL tables. 3NF and BCNF are higher normal forms.', 
     0.00, FALSE)
ON CONFLICT (answer_id) DO UPDATE 
SET answer_text = EXCLUDED.answer_text;
