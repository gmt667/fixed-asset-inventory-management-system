Role	Email	Temporary Password
Administrator	admin@faims.local
Admin@123
Asset Manager	assets@faims.local
Asset@123

Department Manager	manager@faims.local
Manager@123
Auditor	auditor@faims.local
Auditor@123
Employee	employee@faims.local
Employee@123
# Fixed Asset Inventory Management System (FAIMS)

An enterprise-grade Fixed Asset Inventory Management System designed to help organizations efficiently manage the complete lifecycle of their assets, clients, maintenance activities, transfers, audits, and operational reminders.

Built with a modern, responsive interface and real-time data integration, FAIMS streamlines asset tracking while providing role-based access control, audit trails, reporting, and document management capabilities.

---

## Features

### Asset Lifecycle Management

* Asset registration and categorization
* Asset assignment and handover
* Asset transfers between departments
* Maintenance and repair tracking
* Physical verification and auditing
* Asset retirement and disposal
* Infrastructure asset management

### Client Management

* Client registration and management
* Client asset portfolio tracking
* Client-specific asset assignments
* Client activity monitoring

### User and Security Management

* Role-based access control (RBAC)
* Secure authentication and authorization
* User account management
* Session management
* Security audit logs
* Activity tracking

### Automated Reminders

* Internet bundle renewals
* Office rent payments
* Utility bill reminders
* Maintenance schedules
* Asset verification notifications
* Recurring office obligations

### Reporting and Analytics

* Asset utilization reports
* Verification reports
* Audit reports
* Maintenance reports
* Client reports
* Export to PDF, Excel, and CSV

### Document and Receipt Management

* Printable receipts
* Asset handover forms
* Transfer forms
* Maintenance reports
* Verification reports
* Rich-text document creation
* Print preview support

### User Experience

* Responsive design
* Light and dark themes
* Montserrat typography
* Mobile, tablet, and desktop support
* Accessible interface design

---

## User Roles

### Administrator

* Full system access
* User management
* System configuration
* Security monitoring

### Asset Manager

* Manage assets
* Manage clients
* Assign assets
* Track maintenance

### Department Manager

* View department assets
* Request transfers
* Verify assets

### Auditor

* Read-only access
* Audit reports
* Compliance verification

### Employee

* View assigned assets
* Submit service requests
* Track handover history

---

## Technology Stack

### Frontend

* React
* TypeScript
* Bootstrap
* Responsive CSS

### Backend

* Firebase Authentication
* Cloud Firestore
* Firebase Storage

### Additional Tools

* React Router
* Chart.js
* Context API
* PDF Export Libraries

---

## Project Structure

```text
src/
├── components/
├── pages/
├── contexts/
├── services/
├── hooks/
├── utils/
├── assets/
└── types/

public/
```

---

## Installation

### Clone the Repository

```bash
git clone https://github.com/gmt667/fixed-asset-inventory-management-system.git
```

### Navigate to the Project Directory

```bash
cd fixed-asset-inventory-management-system
```

### Install Dependencies

```bash
npm install
```

### Configure Environment Variables

Create a `.env` file in the root directory and add your Firebase configuration:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### Start the Development Server

```bash
npm run dev
```

### Build for Production

```bash
npm run build
```

---

## Localization

The system is configured for organizations operating in Malawi.

* Currency: MWK
* Timezone: Africa/Blantyre
* Date Format: DD/MM/YYYY

---

## Security Features

* Role-based access control
* Protected routes
* Secure authentication
* Input validation
* Audit logging
* Session monitoring
* Permission enforcement

---

## Future Enhancements

* SMS notifications
* Email reminders
* QR code scanning
* Barcode integration
* Mobile application
* API integrations
* Multi-organization support

---

## Contributing

Contributions, feature requests, and suggestions are welcome.

Please create a feature branch, commit your changes, and submit a pull request.

---

## License

This project is intended for educational and organizational use.

---

## Author

**George Taumbe M.**

Computer Engineering Student

University of Livingstonia

GitHub: https://github.com/gmt667

---

## Acknowledgements

Special thanks to Giant Plus Limited and all stakeholders who contributed ideas, feedback, and guidance during the development of this project.
