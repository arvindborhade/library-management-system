# Library Management System

## Tech Stack

**Backend**
- Python 3.11
- FastAPI (REST API)
- PostgreSQL
- Pydantic for request/response validation

**Frontend**
- Next.js / React
- Axios or Fetch API
- Tailwind CSS or simple CSS

**Deployment / Local Setup**
- Docker Compose for PostgreSQL and backend
- `.env` file for DB configuration

---

## Architecture

Modular Monolith using Clean Architecture principles.

**Principles**
- **Modular Monolith** — keeps the app simple and easy to deploy while maintaining module boundaries.
- **Clean Architecture** — separates business logic from frameworks and infrastructure.
- **Repository Pattern** — abstracts database operations for maintainability.
- **Service Layer Pattern** — isolates business workflows from API routes.

**Approach**
1. Modular Monolith architecture to keep development simple, maintainable, and deployment-friendly.
2. Clean Architecture to separate business logic from infrastructure and presentation.
3. Four layers: Presentation, Application, Domain, Infrastructure.
4. Presentation layer exposes REST APIs via FastAPI (auto Swagger docs).
5. Application layer holds use-case services — book creation, borrow, return.
6. Domain layer holds core entities — Books, Members, Borrowings — with validation rules.
7. Infrastructure layer handles PostgreSQL interactions.
8. Repository Pattern abstracts DB operations.
9. Frontend in Next.js (React) — simple, responsive UI for staff.
10. Result: scalable, maintainable, testable, fast to build.

---

## Functional Requirements

### 1. Book Management
- Add, update, view, list books
- Search by title, author, ISBN, or category
- Track total and available copies
- Block borrow if no copy available

### 2. Member Management
- Add, update, view, list members
- Search by name, email, or phone
- Mark active/inactive — inactive members can't borrow

### 3. Borrowing
- Record borrow events
- Validate member exists and is active
- Validate book exists and has available copies
- Create borrowing record, decrement available copies
- Prevent duplicate active borrowings

### 4. Return
- Record return event
- Update status to returned, set return date
- Increment available copies
- Prevent double-returning the same record

### 5. Borrowed Book Queries
- List active borrowings
- List borrowings by member
- View borrowing history
- Filter by status: borrowed / returned / overdue

### 6. Overdue & Fine (Optional)
- Calculate overdue days
- Calculate fine amount (e.g. `overdue_days × ₹10`)
- View overdue books

### 7. Frontend
- Manage books and members from UI
- Borrow / return from UI
- View active borrowings and overdue records

---

## Non-Functional Requirements

### Performance
- API response < 300 ms for normal operations
- Pagination on list APIs
- Efficient search on books and members
- Indexes on ISBN, email, book title, member name, borrowing status

### Scalability
- Stateless backend
- Horizontally scalable
- Schema supports growth in books, members, borrowings
- Pagination for large lists

### Reliability
- Borrow/return operations wrapped in DB transactions
- Available count must never go negative
- Prevent duplicate or inconsistent borrowing records
- Rollback on any DB failure

### Security
- DB credentials via environment variables
- Validate all API input
- Don't commit sensitive config
- CORS restricted to trusted frontend URLs
- Optional: JWT-based staff auth

### Maintainability
- Modular code — separate folders for routes, models, schemas, services
- Business logic in service layer
- Consistent naming
- README covers setup and testing

### Usability
- Simple UI for library staff
- Clear validation messages on forms
- Success/error feedback on borrow and return
- Dashboard with summary cards

### Data Integrity
- Unique ISBN
- Unique member email
- Foreign key constraints
- Validate copy counts
- Active borrowings linked to valid book + member

### Observability
- Log important operations
- Errors logged with meaningful messages
- Health check endpoint
- Swagger UI for API docs

### Portability
- Run locally via Docker Compose
- Containerized PostgreSQL
- `requirements.txt` for backend deps
- `package.json` for frontend deps

### Testability
- APIs testable via Swagger / Postman
- Unit tests for borrow and return logic
- Integration tests for DB operations
- Sample `curl` commands in README

---

## API

### Books
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST   | `/api/books` | Create a book |
| GET    | `/api/books?page=1&page_size=10` | List books |
| GET    | `/api/books/{book_id}` | Get book by ID |
| PUT    | `/api/books/{book_id}` | Update book |
| DELETE | `/api/books/{book_id}` | Soft delete book |
| GET    | `/api/books/search` | Search by title, author, ISBN, category |

### Members
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST   | `/api/members` | Create a member |
| GET    | `/api/members` | List members |
| GET    | `/api/members/{member_id}` | Get member by ID |
| PUT    | `/api/members/{member_id}` | Update member |
| DELETE | `/api/members/{member_id}` | Soft delete member |
| GET    | `/api/members/search` | Search by name, email, phone |

### Borrowings
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/borrowings/borrow` | Borrow a book |
| POST | `/api/borrowings/{borrowing_id}/return` | Return a book |
| GET  | `/api/borrowings` | List all borrowing records |
| GET  | `/api/borrowings/active` | List active borrowings |
| GET  | `/api/borrowings/overdue` | List overdue books |
| GET  | `/api/borrowings/{borrowing_id}` | Get borrowing by ID |

### Member Borrowings
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/members/{member_id}/borrowed-books` | Active borrowings for member |
| GET | `/api/members/{member_id}/borrowing-history` | Full history for member |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/summary` | Summary data |
| GET | `/api/dashboard/recent-activities` | Recent borrow/return activity |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |

---

## Database

```sql
CREATE TABLE books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    isbn VARCHAR(50) UNIQUE,
    category VARCHAR(100),
    total_copies INT NOT NULL DEFAULT 1,
    available_copies INT NOT NULL DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    address TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE borrowings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID NOT NULL REFERENCES books(id),
    member_id UUID NOT NULL REFERENCES members(id),
    borrowed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP NOT NULL,
    returned_at TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'BORROWED',
    fine_amount NUMERIC(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_books_title         ON books(title);
CREATE INDEX idx_books_isbn          ON books(isbn);
CREATE INDEX idx_members_email       ON members(email);
CREATE INDEX idx_borrowings_status   ON borrowings(status);
CREATE INDEX idx_borrowings_member_id ON borrowings(member_id);
```

---

## Seed Data

**Books**
- Atomic Habits
- Clean Code
- Python Crash Course

**Members**
- Rahul Sharma
- Priya Mehta

Used for faster local testing and demos.
