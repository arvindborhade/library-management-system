export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  category: string | null;
  total_copies: number;
  available_copies: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Member {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Borrowing {
  id: string;
  book_id: string;
  member_id: string;
  borrowed_at: string;
  due_date: string;
  returned_at: string | null;
  status: "BORROWED" | "RETURNED";
  fine_amount: string;
  overdue_days: number;
  current_fine_amount: string;
  created_at: string;
  book?: Book;
  member?: Member;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface DashboardSummary {
  total_books: number;
  total_members: number;
  active_borrowings: number;
  overdue_borrowings: number;
}
