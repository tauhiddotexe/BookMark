export type Profile = { display_name: string; avatar_url: string; bio: string };
export type User = { id: number; username: string; email?: string; profile?: Profile };
export type Comment = {
  id: number;
  user: User;
  review?: number;
  body: string;
  created_at: string;
  updated_at: string;
};
export type Book = {
  id: number; google_books_id: string; title: string; slug: string; author: string; description: string;
  published_date: string; page_count: number; categories: string; cover_url: string; thumbnail_url: string;
  average_rating: string; ratings_count: number;
};
export type SearchBookResult = {
  google_books_id: string; title: string; author: string; description: string; published_date: string;
  page_count: number; categories: string; cover_url: string; thumbnail_url: string; existing_slug?: string;
};
export type Review = {
  id: number; user: User; book: Book; rating: string; review_text: string; contains_spoilers: boolean;
  likes_count: number; comments_count: number; latest_comments: Comment[]; created_at: string; updated_at: string;
};
export type DiaryEntry = {
  id: number;
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
export type BookListItem = { id: number; note: string; position: number; book: Book };
export type BookList = { id: number; name: string; description: string; is_public: boolean; items: BookListItem[]; user: User };
export type BookDetail = Book & { reviews: Review[] };
export type ProfileDetail = {
  id: number;
  username: string;
  profile: Profile;
  reviews: Review[];
  lists: BookList[];
  shelves: Record<string, Book[]>;
  diary_entries: DiaryEntry[];
  followers_count: number;
  following_count: number;
  is_following: boolean;
};
export type FeedResponse = { count: number; next: string | null; previous: string | null; results: Review[] };
export type BookState = { 
  shelves: string[]; 
  review: { id: number; rating: string; review_text: string } | null;
  diary_entries: DiaryEntry[];
};
export type Activity = {
  id: number;
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
