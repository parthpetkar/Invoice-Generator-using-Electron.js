# Invoice Generation System

## 🎨 Table of Contents
- [Invoice Generation System](#invoice-generation-system)
- [Description](#description)
- [Contributors](#contributors)
- [Company Logo](#company-logo)
- [Badges](#badges)
- [Demo](#demo)
- [Installation](#installation)
- [How to Use the Project](#how-to-use-the-project)
- [How to Contribute to the Project](#how-to-contribute-to-the-project)
- [Include Credits](#include-credits)
- [License](#license)
- [Security](#security)


## Description
This project aims to provide a comprehensive solution for generating invoices using Electron.js, MySQL, and Node.js. It offers a user-friendly interface for managing invoices efficiently.

## Contributors
- [Parth Petkar](https://github.com/parthpetkar)
- [Contributor Name](https://github.com/contributor)
- [Contributor Name](https://github.com/contributor)
- [Contributor Name](https://github.com/contributor)

## Company Logo
![Company Logo](../invoice_generator/Assets/company-logo.png)

## Badges
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://travis-ci.com/parthpetkar/Invoice-Generator-using-Electron.js.svg?branch=main)](https://github.com/parthpetkar/Invoice-Generator-using-Electron.js)
[![GitHub issues](https://img.shields.io/github/issues/parthpetkar/Invoice-Generator-using-Electron.js)](https://github.com/parthpetkar/Invoice-Generator-using-Electron.js/issues)
[![GitHub stars](https://img.shields.io/github/stars/parthpetkar/Invoice-Generator-using-Electron.js)](https://github.com/parthpetkar/Invoice-Generator-using-Electron.js/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/parthpetkar/Invoice-Generator-using-Electron.js)](https://github.com/parthpetkar/Invoice-Generator-using-Electron.js/network)

## Installation
To install and run this project locally, follow these steps:

1. Clone the repository:
   ```bash
   git clone https://github.com/parthpetkar/Invoice-Generator-using-Electron.js

2. Navigate to the project directory:
   ```bash
   cd invoice_generator

3. Install dependencies:
   ```bash
   npm install

4. Set up MySQL database:
- Create a MySQL database and import the schema from `database_schema.sql`.
   ```sql
   create schema invoic;
   use invoice;
      CREATE TABLE `customers` (
      `company_name` varchar(255) DEFAULT NULL,
      `address` varchar(255) DEFAULT NULL,
      `phone` varchar(20) DEFAULT NULL,
      `gstin` varchar(20) DEFAULT NULL,
      `pan` varchar(20) DEFAULT NULL,
      `cin` varchar(20) NOT NULL,
      PRIMARY KEY (`cin`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

      CREATE TABLE `projects` (
      `cin` varchar(20) NOT NULL,
      `pono` varchar(20) NOT NULL,
      `total_prices` decimal(10,2) DEFAULT NULL,
      `taxes` enum('GST','IGST') DEFAULT NULL,
      `project_name` varchar(255) DEFAULT NULL,
      PRIMARY KEY (`cin`,`pono`),
      CONSTRAINT `projects_ibfk_1` FOREIGN KEY (`cin`) REFERENCES `customers` (`cin`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

      CREATE TABLE `milestones` (
      `cin` varchar(20) NOT NULL,
      `pono` varchar(20) NOT NULL,
      `milestone_name` varchar(255) NOT NULL,
      `claim_percent` decimal(5,2) DEFAULT NULL,
      `amount` decimal(10,2) DEFAULT NULL,
      PRIMARY KEY (`cin`,`pono`,`milestone_name`),
      CONSTRAINT `milestones_ibfk_1` FOREIGN KEY (`cin`, `pono`) REFERENCES `projects` (`cin`, `pono`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
- Update the MySQL connection details in `.env`.
   ```
   DB_HOST
   DB_USER
   DB_PASSWORD
   DB_DATABASE

5. Run the code
   ```bash
   npm run watch


## How to Use the Project
To use the project, follow these steps:

1. Launch the application.
2. Create a new invoice by filling in the required details.
3. Save or print the generated invoice.

## 🛠️ Contribution guidelines for this project
We welcome contributions from the community! To contribute to this project, please follow these steps:

1. Fork the repository.
2. Create a new branch (`git checkout -b feature/contribution`).
3. Make your changes and commit them (`git commit -am 'Add new feature'`).
4. Push to the branch (`git push origin feature/contribution`).
5. Create a new Pull Request.

## License
This project is licensed under the [MIT License](LICENSE).

## Security
🔒 If you discover any security-related issues, please email [parth.petkar221@vit.edu](parth.petkar221@vit.edu) instead of using the issue tracker.
