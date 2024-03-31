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
- [Contributor Name](https://github.com/parthpetkar)
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
   CREATE TABLE Invoices (
    invoice_id INT PRIMARY KEY,
    invoice_number VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    description TEXT,
    taxes ENUM('yes', 'no') NOT NULL
    );

    CREATE TABLE Milestones (
        milestone_id INT PRIMARY KEY,
        invoice_id INT,
        milestone_percentage DECIMAL(5, 2) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        FOREIGN KEY (invoice_id) REFERENCES Invoices(invoice_id)
    );
- Update the MySQL connection details in `.env`.
   ```
   DB_HOST
   DB_USER
   DB_PASSWORD
   DB_DATABASE


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
