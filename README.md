# AssetGuard: Comprehensive Asset Management System

## Overview

AssetGuard is a modern, web-based application designed to provide a complete, real-time overview of your company's physical and digital assets. It simplifies asset tracking, employee assignments, software license management, and more through a clean, intuitive, and secure interface.

Built with Next.js, React, and a flexible backend that can connect to an external MS SQL Server, AssetGuard is a powerful tool for IT administrators and operations managers.

---

## Key Features

The application is organized into several key modules, each accessible from the main navigation tabs:

- **Dashboard:** A central hub providing a high-level, at-a-glance overview of your entire asset inventory, including key statistics, asset status distribution, license usage, and recent activity.

- **Asset Management:**
  - Keep a detailed inventory of all company hardware, from laptops to peripherals.
  - Track asset details like make, model, serial number, purchase information, and specifications.
  - Assign assets to employees and manage their status (Available, Assigned, Donated, E-Waste).
  - Import/Export asset lists via CSV for bulk operations.
  - Add comments and view a complete audit history for every asset.

- **Employee Management:**
  - Maintain a comprehensive database of all employees, including their department, designation, and contact information.
  - View all assets and software licenses assigned to a specific employee.
  - Process employee exits, which automatically unassigns all their assets.
  - Import/Export employee records via CSV.

- **Vendor Management:**
  - Manage a list of all your suppliers and vendors.
  - Store contact details, addresses, and a list of products or services for each vendor.
  - Import/Export vendor lists via CSV.

- **Software Licensing:**
  - Track all software licenses, including version, purchase/expiry dates, and total license counts.
  - Assign and unassign licenses to employees, with validation to prevent over-allocation.
  - Monitor license usage and get alerts for licenses expiring soon from the dashboard.
  - Import/Export software license data via CSV.

- **Consumables:**
  - Manage stock levels of consumable items like keyboards, mice, and cables.
  - Issue items to employees and automatically decrement stock.
  - Revoke issued items to restore stock levels.
  - View a complete audit trail and issue history for every consumable item.

- **Awards & Recognition:**
  - Formally recognize employee achievements with customizable award certificates.
  - Create and manage different award types (e.g., "Employee of the Month").
  - Lock award records to prevent accidental editing or deletion.
  - Preview and download professional, print-ready PDF certificates.

- **Labeler:**
  - Generate and print professional asset labels with unique QR codes.
  - QR codes store key asset details, allowing for quick scanning and identification.
  - Import asset data directly from a CSV or select from existing assets to generate labels in bulk.
  - A live print preview arranges labels efficiently on a standard A4 page.

- **Reports:**
  - A powerful reporting module to analyze and export your data.
  - **Custom Report Builder:** Create your own reports by selecting a data source (Assets, Employees, etc.), choosing columns, and applying filters.
  - **Pre-built Reports:** Includes reports for Employee-Asset assignments, full inventory lists, inactive employees, assets by type, and more.
  - Export any report to either CSV or a print-ready PDF format.

- **Settings:**
  - **Database Configuration:** Choose between the default Firebase backend or connect to your own external MS SQL Server database. Includes a one-click "Setup" button to create all necessary tables.
  - **Email (SMTP):** Configure an SMTP server to enable email notifications for key events (e.g., adding a comment to an asset).
  - **Company Info:** Customize reports and certificates with your company's name, logo, and address.
  - **Configuration:** Manage the dropdown options used throughout the app for fields like "Processor," "RAM," "Departments," etc.
  - **Security:** Change your login password.

- **User Management (for SuperAdmins):**
  - The primary account holder (SuperAdmin) can create, manage, and delete sub-user accounts.
  - Sub-users have the same level of access to the tenant's data.

---

## Getting Started: Initial Setup Guide

When you first run the application, you'll need to perform a one-time setup to get everything working correctly.

1.  **Sign Up for an Account:**
    - The first user to sign up becomes the **SuperAdmin**. Their account creates a new, isolated "tenant" space.
    - Subsequent users must be created by the SuperAdmin from the **User Management** page.

2.  **Navigate to the Settings Page:**
    - Once you log in, you will land on the Dashboard. Click on the **"Settings"** tab in the main navigation bar.

3.  **Configure the Database:**
    - In Settings, go to the **"Database"** tab.
    - You will see that the provider is set to **"External SQL Server"**.
    - Fill in your MS SQL Server connection details: `Host`, `Port`, `Database Name`, `Username`, and `Password`.
    - Click **"Save Configuration"**. The app will test the connection and confirm if it's successful.

4.  **Create Database Tables:**
    - After saving your connection details, a **"Setup Database Tables"** button will be available.
    - Click this button. The application will connect to your database and automatically create all the required tables (`Assets`, `Employees`, `Vendors`, etc.).
    - You only need to do this once for a new database.

5.  **(Optional) Configure SMTP for Emails:**
    - Navigate to the **"Email (SMTP)"** tab in Settings.
    - Enter your SMTP server details. This will enable the application to send email notifications.
    - Go to the **"Recipients"** tab to add the email addresses that should receive these notifications.

Your AssetGuard application is now fully configured and ready to use! You can start adding data manually or by using the CSV import functions on each page.