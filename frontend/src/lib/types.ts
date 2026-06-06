export type Profile = { display_name: string; avatar_url: string; bio: string; favorite_genres?: string[] };
export type User = { id: string; username: string; email?: string; profile?: Profile; date_joined?: string };
export type Comment = {
  id: string;
  user: User;
  review?: string;
  body: string;
  created_at: string;
  updated_at: string;
};
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
  id: string; user: User; book: Book; rating: string; review_text: string; contains_spoilers: boolean;
  likes_count: number; comments_count: number; latest_comments: Comment[]; created_at: string; updated_at: string;
};
export type DiaryEntry = {
  id: string;
  user: User;
  book: Book;
  read_date: string;
  rating: string | null;
  review_text: string;
  is_reread: boolean;
  contains_spoilers: boolean;
  likes_count: number;
  comments_count: number;
  created_at: string;
};
export type BookListItem = { id: string; note: string; position: number; book: Book };
export type BookList = { id: string; name: string; description: string; is_public: boolean; items: BookListItem[]; user: User };
export type BookDetail = Book & { reviews: Review[]; diary_entries: DiaryEntry[] };
export type ProfileDetail = {
  id: string;
  username: string;
  profile: Profile;
  reviews: Review[];
  lists: BookList[];
  shelves: Record<string, Book[]>;
  diary_entries: DiaryEntry[];
  followers_count: number;
  following_count: number;
  is_following: boolean;
  date_joined?: string;
};
export type FeedResponse = { count: number; next: string | null; previous: string | null; results: Review[] };
export type BookState = { 
  shelves: string[]; 
  review: { id: string; rating: string; review_text: string } | null;
  diary_entries: DiaryEntry[];
};
export type DiaryResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: DiaryEntry[];
};
export type Activity = {
  id: string;
  user_name: string;
  display_name: string;
  avatar_url: string;
  activity_type: "log" | "review" | "follow" | "shelf";
  content_id: string;
  content_type_label: string;
  book_title?: string;
  book_slug?: string;
  book_cover?: string;
  target_user_name?: string;
  data: any;
  created_at: string;
};

export type ActivityResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: Activity[];
};
