export type Profile = { display_name: string; avatar_url: string; bio: string; favorite_genres?: string[] };
export type User = { id: string; username: string; email?: string; profile?: Profile; date_joined?: string };

export type Book = {
  id: string; google_books_id: string; title: string; slug: string; author: string; description: string;
  published_date: string; page_count: number; categories: string; cover_url: string; thumbnail_url: string;
  average_rating: string; ratings_count: number; openlibrary_id?: string; isbn_13?: string; isbn_10?: string;
};

export type SearchBookResult = {
  google_books_id: string; title: string; author: string; description: string; published_date: string;
  page_count: number; categories: string; cover_url: string; thumbnail_url: string; existing_slug?: string;
  openlibrary_id?: string; isbn_13?: string; isbn_10?: string;
};

export type Review = {
  id: string; user: User; book: Book; rating: string; review_text: string;
  created_at: string; updated_at: string;
};

export type DiaryEntry = {
  id: string; user: User; book: Book; read_date: string; rating: string | null;
  review_text: string; is_reread: boolean; tags: string[]; created_at: string;
};

export type DiaryResponse = {
  count: number; next: string | null; previous: string | null; results: DiaryEntry[];
};

export type ReadlistEntry = {
  id: string; book: Book; status: string; current_page: number;
  start_date: string | null; created_at: string;
};

export type FavoriteBook = {
  id: string; book: Book; created_at: string;
};

export type UserStats = {
  total_books_read: number; books_read_this_year: number; total_reviews: number;
  average_rating: number; favorite_genres: string[];
};

export type BookList = {
  id: string; name: string; description: string; is_ranked: boolean;
  item_count: number; created_at: string;
};

export type BookListItem = {
  id: string; book: Book; position: number; notes: string; created_at: string;
};

export type BookListDetail = {
  id: string; name: string; description: string; is_ranked: boolean;
  items: BookListItem[]; created_at: string;
};

export type MeDetail = {
  id: string; username: string; email?: string; profile: Profile; date_joined?: string;
  reviews: Review[]; diary_entries: DiaryEntry[]; readlist: ReadlistEntry[];
  favorite_books: FavoriteBook[]; stats: UserStats;
};
