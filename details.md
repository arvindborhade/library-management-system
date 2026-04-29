Approach & Solution Design
    Tech Stack
        Backend 
            Python 3.11
            FastAPI REST API
            PostgreSQL
            Pydantic for request/response validation

        Frontend
            Next.js / React
            Axios or Fetch API
            Tailwind CSS or simple CSS

        Deployment / Local Setup 
            Docker Compose for PostgreSQL and backend
            .env file for DB configuration

    Architecture Approach

        The application will follow a Modular Monolith Architecture using Clean Architecture Principles.

        Architecture Principles
            Modular Monolith
                Keeps the application simple and easy to deploy while maintaining module boundaries.

            Clean Architecture
                Separates business logic from frameworks and infrastructure.

            Repository Pattern
                Abstracts database operations for maintainability.

            Service Layer Pattern
                Business workflows are isolated from API routes.

Appproch: 
    1. The application will follow a Modular Monolith architecture to keep development simple, maintainable, and deployment-friendly.
    2. We will use Clean Architecture principles to separate business logic from infrastructure and presentation layers.
    3. The system will be divided into four layers: Presentation, Application, Domain, and Infrastructure.
    4. The Presentation Layer will expose REST APIs using Python FastAPI for easy integration and API documentation.
    5. The Application Layer will contain use-case-specific services such as book creation, borrowing, and returning workflows.
    6. The Domain Layer will manage core business entities like Books, Members, and Borrowings, including validation rules.
    7. The Infrastructure Layer will handle database interactions using PostgreSQL.
    8. The application will implement the Repository Pattern to abstract database operations and improve code maintainability.
    9. The frontend will be built using Next.js (React) to provide a simple and responsive user interface for library staff.
    10. This approach ensures scalability, maintainability, testability, and faster development, making it ideal for the library management system.


------------------------- Functional Requirements -------------------------

1. Book Management: 
    Staff can add a new book.
    Staff can update book details.
    Staff can view book details.
    Staff can list all books.
    Staff can search books by title, author, ISBN, or category.
    System tracks total copies and available copies.
    System prevents borrowing if no copy is available.
2. Member Management:
    Staff can add a new member.
    Staff can update member details.
    Staff can view member details.
    Staff can list all members.
    Staff can search members by name, email, or phone.
    System can mark members as active/inactive.
    Inactive members cannot borrow books.
3. Borrowing Management:
    Staff can record when a member borrows a book.
    System validates that the member exists and is active.
    System validates that the book exists and has available copies.
    System creates a borrowing record.
    System reduces available book copies after borrowing.
    System prevents the same active borrowing from being duplicated.
4. Return Management:
    Staff can record when a borrowed book is returned.
    System updates the borrowing status to returned.
    System records the return date.
    System increases available book copies after return.
    System prevents returning the same borrowing record twice.
5. Borrowed Book Query:
    Staff can view all active borrowed books.
    Staff can view all books borrowed by a specific member.
    Staff can view borrowing history.
    Staff can filter borrowings by status: borrowed, returned, overdue.
6. Overdue and Fine Management — Optional:
    System can calculate overdue days.
    System can calculate fine amount.
    Staff can view overdue books.
    Fine rule example: overdue days × ₹10.
7. Frontend Requirements:
    Staff can use a web UI to manage books.
    Staff can use a web UI to manage members.
    Staff can borrow and return books from the UI.
    Staff can view active borrowings and overdue records.



------------------------- Non Functional  -------------------------

1. Performance:
    API response time should be under 300 ms for normal operations.
    List APIs should support pagination.
    Search should work efficiently for books and members.
    Database indexes should be added on ISBN, email, book title, member name, and borrowing status.
2. Scalability: 
    Backend should be stateless.
    Application should support horizontal scaling.
    Database schema should support growth in books, members, and borrowing records.
    Pagination should be used for large lists.
3. Reliability
    Borrow and return operations should use database transactions.
    Available book count should never become negative.
    System should prevent duplicate or inconsistent borrowing records.
    Proper rollback should happen if any database operation fails.
4. Security
    Environment variables should be used for database credentials.
    API input should be validated.
    Sensitive configuration should not be committed to Git.
    CORS should allow only trusted frontend URLs.
    Optional staff authentication can be added using JWT.
5. Maintainability
    Code should be modular.
    Separate folders should be used for routes, models, schemas, and services.
    Business logic should be placed in service layer.
    Clear naming conventions should be followed.
    README should explain setup and testing steps.
6. Usability
    Frontend should be simple and easy for library staff.
    Forms should have clear validation messages.
    Borrow and return actions should show success/error messages.
    Dashboard should show quick summary cards.
7. Data Integrity
    ISBN should be unique.
    Member email should be unique.
    Foreign key relationships should be used.
    Book copy count should be validated.
    Active borrowing records should be properly linked to books and members.
8. Observability
    Application should log important operations.
    Errors should be logged with meaningful messages.
    Health check endpoint should be available.
    API documentation should be available through Swagger UI.
9. Portability
    Application should run locally using Docker Compose.
    PostgreSQL should be containerized.
    Backend dependencies should be listed in requirements.txt.
    Frontend dependencies should be listed in package.json.
10. Testability
    Core APIs should be testable using Swagger/Postman.
    Unit tests should be added for borrow and return logic.
    Integration tests can be added for database operations.
    Sample curl commands should be provided in README.



API: 
    Books APIs
        /api/books POST
            - Create a new book

        /api/books?page=1&page_size=10 GET
            - List all books
               

        /api/books/{book_id} GET
            - Get book details by ID

        /api/books/{book_id} PUT
            - Update book details

        /api/books/{book_id} DELETE
            - Soft delete a book

        /api/books/search GET
            - Search books by title, author, ISBN, or category
    
    Members APIs
        /api/members POST
            - Create a new member

        /api/members GET
            - List all members

        /api/members/{member_id} GET
            - Get member details by ID

        /api/members/{member_id} PUT
            - Update member details

        /api/members/{member_id} DELETE
            - Soft delete a member

        /api/members/search GET
            - Search members by name, email, or phone

    Borrowing APIs
        /api/borrowings/borrow POST
            - Borrow a book

        /api/borrowings/{borrowing_id}/return POST
            - Return a borrowed book

        /api/borrowings GET
            - List all borrowing records

        /api/borrowings/active GET
            - List all active borrowed books

        /api/borrowings/overdue GET
            - List all overdue books

        /api/borrowings/{borrowing_id} GET
            - Get borrowing details by ID



    Member Borrowing APIs
        /api/members/{member_id}/borrowed-books GET
            - List all active borrowed books for a member

        /api/members/{member_id}/borrowing-history GET
            - Get complete borrowing history for a member

    Dashboard APIs
        /api/dashboard/summary GET
            - Get dashboard summary data

        /api/dashboard/recent-activities GET
            - Get recent borrow and return activities


    Health APIs
        /api/health GET
            - Health check endpoint

Database Design

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


CREATE INDEX idx_books_title ON books(title);
CREATE INDEX idx_books_isbn ON books(isbn);
CREATE INDEX idx_members_email ON members(email);
CREATE INDEX idx_borrowings_status ON borrowings(status);
CREATE INDEX idx_borrowings_member_id ON borrowings(member_id);



Seed Data

Books:
    Atomic Habits
    Clean Code
    Python Crash Course

Members: 
    Rahul Sharma
    Priya Mehta

Purpose: 
    Faster local testing
    Demo data