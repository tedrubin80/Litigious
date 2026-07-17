# Litigious — User guide

Guide for **firm staff and administrators** using a Litigious deployment (hosted demo or self-hosted).

> **Developers:** see [INSTALL.md](INSTALL.md) for setup and deployment.

## Accessing Litigious

| Portal | URL | Who |
|--------|-----|-----|
| **Staff** | `/admin/login` | Admins, attorneys, paralegals |
| **Client** | `/client/login` | Clients with portal accounts |

On the hosted demo: [litigious.online](https://litigious.online)

## Roles

| Role | Typical access |
|------|----------------|
| **Super Admin** | Users, AI keys, LMS import, all cases |
| **Admin** | User management, firm-wide settings |
| **Attorney** | Assigned cases, documents, time, billing |
| **Paralegal / Assistant** | Case support, tasks, documents |
| **Client** | Own cases, documents, messages (portal only) |

## Core workflows

### Cases

1. **Clients** → create or import a client record  
2. **Cases** → New case → link client, type, status  
3. Track status, deadlines, and team assignments on the case detail page  

### Documents

- Upload from **Documents** or from within a case  
- Preview supported formats in-browser  
- Clients see only documents shared to their portal scope  

### Time tracking

- Log time from **Time Tracking** or case context  
- Mark billable / billed; tie entries to cases for invoicing  

### Tasks

- **Tasks** board for firm-wide and case-linked work  
- Filter by assignee, due date, and status  

## Client portal

Clients log in at **Client login** with credentials your firm provides. They can:

- View linked cases and status  
- Access shared documents  
- See updates scoped to their matters  

Staff create client portal users from **User Management** (admin).

## Migrating from another LMS

Admins can import from **Clio**, **MyCase**, or **PracticePanther**:

1. Go to **Admin → LMS Import**  
2. Choose source and entities (contacts → matters → time entries)  
3. Run a **dry run** first — review counts and errors  
4. **Commit** only when the preview looks correct  

Details: [IMPORT_MIGRATION.md](IMPORT_MIGRATION.md)

## Settings & security

- **Settings** — password change, 2FA setup (staff)  
- **User Management** — invite staff, assign roles (admin)  
- **AI Provider Keys** — optional; add your own OpenAI/Anthropic/etc. keys (admin)  

## Demo accounts

For the public demo or after `npm run seed:demo`:

| Role | Email | Password |
|------|-------|----------|
| Super Admin | `admin@litigious.online` | `DemoShow2026!` |
| Attorney | `attorney@litigious.online` | `DemoShow2026!` |
| Client | `client@litigious.online` | `DemoShow2026!` |

See [DEMO_DATA.md](DEMO_DATA.md) for what the seed includes.

## Getting help

- **Bug or feature request:** [GitHub Issues](https://github.com/tedrubin80/Litigious/issues)  
- **Self-hosting:** [INSTALL.md](INSTALL.md)  
- **Contact:** ted@theorubin.com  

## License

Litigious is open source under the [MIT License](../LICENSE).
