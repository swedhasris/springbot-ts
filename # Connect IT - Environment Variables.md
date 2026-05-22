# Connect IT - Environment Variables
# Copy this file to .env and fill in your actual values

# ============================================
# MySQL Database Configuration
# ============================================
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=connectit_db

# ============================================
# Gemini AI API Key (Optional)
# ============================================
GEMINI_API_KEY=AIzaSyD7X-NZaDxd_J381on_io8Tvx1LTMDyRqk

# ============================================
# Node Environment
# ============================================
NODE_ENV=development

# ============================================
# Server Configuration
# ============================================
PORT=3000

# ============================================
# Firebase Configuration (Legacy - for migration only)
# ============================================
# These are only needed for running the migration script
# After migration is complete, these can be removed
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_DATABASE_ID=your_firestore_database_id

# ============================================
# Email Configuration (Optional - for notifications)
# ============================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=dhipaksankar06@gmail.com
SMTP_PASS=pkeaypbldqronzqk


# ============================================
# Session/JWT Configuration
# ============================================
JWT_SECRET=ConnectIT_2026_Secure_JWT_Key_987654321
SESSION_TIMEOUT=86400

# ============================================
# PHP Backend Configuration (for timesheet module)
# ============================================
# Timesheet uses its own database configuration
# Set these for MySQL or leave empty for SQLite fallback
DB_HOST=localhost
DB_NAME=timesheet_db
DB_USER=root
DB_PASS=your_mysql_password
