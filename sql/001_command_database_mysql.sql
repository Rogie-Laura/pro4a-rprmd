-- PRO4A Command Database — MySQL (Hostinger phpMyAdmin)
-- Database: command_database
-- Table: personnel_list

CREATE DATABASE IF NOT EXISTS command_database
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE command_database;

CREATE TABLE IF NOT EXISTS personnel_list (
  id INT AUTO_INCREMENT PRIMARY KEY,
  division_code VARCHAR(10) NOT NULL COMMENT 'R1=RPRMD, R2=RID, etc. Not geographic region',
  directorate VARCHAR(50) NOT NULL,
  `rank` VARCHAR(50) DEFAULT NULL,
  fname VARCHAR(100) NOT NULL,
  mname VARCHAR(100) DEFAULT NULL,
  lname VARCHAR(100) NOT NULL,
  qual VARCHAR(100) DEFAULT NULL,
  rank_name VARCHAR(255) GENERATED ALWAYS AS (
    NULLIF(TRIM(CONCAT_WS(' ',
      NULLIF(TRIM(`rank`), ''),
      NULLIF(TRIM(fname), ''),
      NULLIF(TRIM(mname), ''),
      NULLIF(TRIM(lname), ''),
      NULLIF(TRIM(qual), '')
    )), '')
  ) STORED,
  badge_number VARCHAR(30) DEFAULT NULL,
  office VARCHAR(150) DEFAULT NULL,
  unit VARCHAR(150) DEFAULT NULL,
  designation VARCHAR(150) DEFAULT NULL,
  birthdate DATE DEFAULT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'Active',
  disposition VARCHAR(100) DEFAULT NULL,
  remarks TEXT DEFAULT NULL,
  gender VARCHAR(20) DEFAULT NULL,
  email VARCHAR(255) DEFAULT NULL,
  phone_number VARCHAR(30) DEFAULT NULL,
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_personnel_division_code (division_code),
  INDEX idx_personnel_directorate (directorate),
  INDEX idx_personnel_division_directorate (division_code, directorate),
  INDEX idx_personnel_office (office),
  INDEX idx_personnel_unit (unit),
  INDEX idx_personnel_status (status),
  INDEX idx_personnel_badge (badge_number)
) ENGINE=InnoDB;
