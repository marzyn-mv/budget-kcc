# Kulhudhuffushi City Council - Budget 2026

A Next.js web application for viewing, searching, and managing the approved budget of Kulhudhuffushi City Council for the year 2026.

## Features

### Public Frontend
- **Budget Overview** - Summary cards showing total budget and item counts
- **Fund Breakdown** - Quick-filter cards for each fund type (J-GOM, J-LCL, L-CWDF, etc.)
- **Search** - Full-text search across activities, program codes, and GL codes
- **Filters** - Filter by Fund type and Cost Center
- **Pagination** - Browse through 408 budget line items
- **Responsive** - Works on desktop and mobile

### Admin Backend (Protected)
- **Access Code Authentication** - Secured via access code with session cookies
- **Edit Budget Items** - Inline editing of any budget line item
- **Upload Excel** - Replace budget data by uploading a new `.xlsx` file
- **System Logs** - View all actions (logins, edits, uploads, errors)
- **Winston Logging** - File-based logs in `logs/combined.log` and `logs/error.log`

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: SQLite (via better-sqlite3)
- **Styling**: Tailwind CSS
- **Excel Parsing**: SheetJS (xlsx)
- **Logging**: Winston
- **Auth**: Access code with HTTP-only session cookies

## Getting Started

### Prerequisites
- Node.js 18+
- npm

### Installation

```bash
npm install
```

### Seed the Database

Import budget data from an Excel file:

```bash
npm run seed -- "path/to/Approved Budget 2026.xlsx"
```

The Excel file should have these columns:
- `ActCodeID` - Activity code identifier
- `ActiveID` - Active identifier
- `Fund` - Fund code (e.g., J-GOM, J-LCL)
- `ActivityDetail` - Description of the budget activity
- `Prog` - Program code
- `CenterName` - Cost center name
- `GLCode` - General Ledger code
- `Budget` - Budget amount

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the budget.

### Admin Access

1. Navigate to [http://localhost:3000/admin](http://localhost:3000/admin)
2. Enter the access code (default: `council2026`)
3. Set a custom code via `ADMIN_ACCESS_CODE` in `.env.local`

## Project Structure

```
budget/
├── data/               # SQLite database
├── logs/               # Winston log files
├── uploads/            # Uploaded Excel files
├── scripts/
│   └── seed.ts         # Database seeder
├── src/
│   ├── app/
│   │   ├── page.tsx            # Public budget viewer
│   │   ├── layout.tsx          # App layout with nav
│   │   ├── admin/
│   │   │   ├── page.tsx        # Admin dashboard
│   │   │   ├── upload/page.tsx # Excel upload page
│   │   │   └── logs/page.tsx   # System logs viewer
│   │   └── api/
│   │       ├── budget/         # Budget CRUD endpoints
│   │       ├── auth/           # Authentication
│   │       └── logs/           # Log viewer API
│   ├── components/
│   │   ├── BudgetTable.tsx     # Data table
│   │   ├── SearchFilters.tsx   # Search & filter bar
│   │   ├── SummaryCards.tsx    # Budget summary cards
│   │   ├── Pagination.tsx      # Page navigation
│   │   └── EditModal.tsx       # Edit item modal
│   └── lib/
│       ├── db.ts               # Database connection
│       ├── auth.ts             # Authentication helpers
│       ├── logger.ts           # Winston logger
│       └── types.ts            # TypeScript types
├── .env.local          # Environment variables
└── package.json
```

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/budget` | No | List budget items (search, filter, paginate) |
| GET | `/api/budget/summary` | No | Budget summary & totals |
| POST | `/api/budget/upload` | Yes | Upload Excel file |
| PUT | `/api/budget/edit` | Yes | Edit a budget item |
| POST | `/api/auth` | No | Login with access code |
| GET | `/api/auth` | No | Check auth status |
| DELETE | `/api/auth` | No | Logout |
| GET | `/api/logs` | Yes | View system logs |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ADMIN_ACCESS_CODE` | `council2026` | Access code for admin panel |

## Budget Data

- **Total Budget**: MVR 120,444,385.85
- **Line Items**: 408
- **Fund Types**: J-GOM, J-LCL, L-CWDF, L-CPAF, L-CRF, L-CTPF
- **Cost Centers**: Idhaaree hingun, Rahvehi Khidhumaiy
