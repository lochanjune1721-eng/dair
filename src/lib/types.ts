export type EntryStatus = "reserved" | "paid" | "submitted" | "approved" | "rejected";

export type Season = {
  id: string;
  name: string;
  dare_text: string;
  dare_description: string | null;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
  total_slots: number;
  created_at: string;
}

export type Entry = {
  id: string;
  season_id: string;
  slug: string;
  company_name: string;
  company_url: string | null;
  product_tagline: string | null;
  logo_path: string | null;
  video_path: string | null;
  video_duration: number | null;
  slot_number: number | null;
  status: EntryStatus;
  contact_email: string;
  stripe_session_id: string | null;
  stripe_payment_intent: string | null;
  vote_count: number;
  click_count: number;
  view_count: number;
  created_at: string;
  submitted_at: string | null;
  reserved_until: string | null;
}

/** An approved entry as the public sees it. No email, no Stripe ids. */
export type PublicEntry = Pick<
  Entry,
  | "id"
  | "slug"
  | "company_name"
  | "company_url"
  | "product_tagline"
  | "logo_path"
  | "video_path"
  | "video_duration"
  | "slot_number"
  | "vote_count"
  | "click_count"
  | "view_count"
  | "submitted_at"
>;

export const PUBLIC_ENTRY_COLUMNS =
  "id,slug,company_name,company_url,product_tagline,logo_path,video_path,video_duration,slot_number,vote_count,click_count,view_count,submitted_at";

type VoteRow = {
  id: string;
  entry_id: string;
  voter_fingerprint: string;
  ip_hash: string | null;
  created_at: string;
};

type ClickRow = { id: string; entry_id: string; created_at: string; referrer: string | null };

type ViewRow = {
  id: string;
  entry_id: string;
  voter_fingerprint: string | null;
  created_at: string;
};

/** Hand-written to match supabase-js's GenericSchema shape. */
export type Database = {
  public: {
    Tables: {
      seasons: {
        Row: Season;
        Insert: Partial<Season> & Pick<Season, "name" | "dare_text">;
        Update: Partial<Season>;
        Relationships: [];
      };
      entries: {
        Row: Entry;
        Insert: Partial<Entry> &
          Pick<Entry, "season_id" | "slug" | "company_name" | "contact_email">;
        Update: Partial<Entry>;
        Relationships: [];
      };
      votes: {
        Row: VoteRow;
        Insert: Pick<VoteRow, "entry_id" | "voter_fingerprint"> & { ip_hash?: string | null };
        Update: Partial<VoteRow>;
        Relationships: [];
      };
      clicks: {
        Row: ClickRow;
        Insert: Pick<ClickRow, "entry_id"> & { referrer?: string | null };
        Update: Partial<ClickRow>;
        Relationships: [];
      };
      views: {
        Row: ViewRow;
        Insert: Pick<ViewRow, "entry_id"> & { voter_fingerprint?: string | null };
        Update: Partial<ViewRow>;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      claim_slot: {
        Args: {
          p_entry_id: string;
          p_session_id: string | null;
          p_payment_intent: string | null;
        };
        Returns: Entry;
      };
      slots_taken: { Args: { p_season_id: string }; Returns: number };
      release_expired_reservations: { Args: Record<never, never>; Returns: number };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
}
