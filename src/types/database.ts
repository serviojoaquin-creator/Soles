export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          avatar_path: string | null;
          created_at: string;
          deleted_at: string | null;
          display_name: string;
          id: string;
          updated_at: string;
        };
        Insert: {
          avatar_path?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          display_name: string;
          id: string;
          updated_at?: string;
        };
        Update: {
          avatar_path?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          display_name?: string;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      trips: {
        Row: {
          completed_at: string | null;
          cover_path: string | null;
          created_at: string;
          created_by: string;
          default_timezone: string;
          deleted_at: string | null;
          description: string | null;
          destination: string;
          end_date: string;
          id: string;
          name: string;
          start_date: string;
          status: Database["public"]["Enums"]["trip_status"];
          updated_at: string;
        };
        Insert: {
          completed_at?: string | null;
          cover_path?: string | null;
          created_at?: string;
          created_by: string;
          default_timezone: string;
          deleted_at?: string | null;
          description?: string | null;
          destination: string;
          end_date: string;
          id?: string;
          name: string;
          start_date: string;
          status?: Database["public"]["Enums"]["trip_status"];
          updated_at?: string;
        };
        Update: {
          completed_at?: string | null;
          cover_path?: string | null;
          created_at?: string;
          created_by?: string;
          default_timezone?: string;
          deleted_at?: string | null;
          description?: string | null;
          destination?: string;
          end_date?: string;
          id?: string;
          name?: string;
          start_date?: string;
          status?: Database["public"]["Enums"]["trip_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "trips_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      trip_members: {
        Row: {
          archived_at: string | null;
          joined_at: string;
          role: Database["public"]["Enums"]["trip_role"];
          trip_id: string;
          user_id: string;
        };
        Insert: {
          archived_at?: string | null;
          joined_at?: string;
          role?: Database["public"]["Enums"]["trip_role"];
          trip_id: string;
          user_id: string;
        };
        Update: {
          archived_at?: string | null;
          joined_at?: string;
          role?: Database["public"]["Enums"]["trip_role"];
          trip_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "trip_members_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trip_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      trip_invites: {
        Row: {
          created_at: string;
          created_by: string;
          expires_at: string;
          id: string;
          invited_email: string | null;
          max_uses: number;
          revoked_at: string | null;
          role: Database["public"]["Enums"]["trip_role"];
          token_hash: string;
          trip_id: string;
          use_count: number;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          expires_at: string;
          id?: string;
          invited_email?: string | null;
          max_uses?: number;
          revoked_at?: string | null;
          role?: Database["public"]["Enums"]["trip_role"];
          token_hash: string;
          trip_id: string;
          use_count?: number;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          expires_at?: string;
          id?: string;
          invited_email?: string | null;
          max_uses?: number;
          revoked_at?: string | null;
          role?: Database["public"]["Enums"]["trip_role"];
          token_hash?: string;
          trip_id?: string;
          use_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: "trip_invites_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trip_invites_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      activities: {
        Row: {
          activity_date: string;
          created_at: string;
          created_by: string;
          deleted_at: string | null;
          description: string | null;
          end_time: string | null;
          id: string;
          latitude: number | null;
          location_name: string | null;
          longitude: number | null;
          position: number;
          start_time: string | null;
          status: Database["public"]["Enums"]["activity_status"];
          timezone: string;
          title: string;
          trip_id: string;
          updated_at: string;
        };
        Insert: {
          activity_date: string;
          created_at?: string;
          created_by: string;
          deleted_at?: string | null;
          description?: string | null;
          end_time?: string | null;
          id?: string;
          latitude?: number | null;
          location_name?: string | null;
          longitude?: number | null;
          position?: number;
          start_time?: string | null;
          status?: Database["public"]["Enums"]["activity_status"];
          timezone: string;
          title: string;
          trip_id: string;
          updated_at?: string;
        };
        Update: {
          activity_date?: string;
          created_at?: string;
          created_by?: string;
          deleted_at?: string | null;
          description?: string | null;
          end_time?: string | null;
          id?: string;
          latitude?: number | null;
          location_name?: string | null;
          longitude?: number | null;
          position?: number;
          start_time?: string | null;
          status?: Database["public"]["Enums"]["activity_status"];
          timezone?: string;
          title?: string;
          trip_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "activities_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activities_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      photos: {
        Row: {
          activity_id: string | null;
          created_at: string;
          deleted_at: string | null;
          description: string | null;
          height: number | null;
          id: string;
          mime_type: string;
          original_name: string;
          size_bytes: number;
          storage_path: string;
          taken_at: string | null;
          trip_id: string;
          updated_at: string;
          uploaded_by: string;
          width: number | null;
        };
        Insert: {
          activity_id?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          description?: string | null;
          height?: number | null;
          id?: string;
          mime_type: string;
          original_name: string;
          size_bytes: number;
          storage_path: string;
          taken_at?: string | null;
          trip_id: string;
          updated_at?: string;
          uploaded_by: string;
          width?: number | null;
        };
        Update: {
          activity_id?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          description?: string | null;
          height?: number | null;
          id?: string;
          mime_type?: string;
          original_name?: string;
          size_bytes?: number;
          storage_path?: string;
          taken_at?: string | null;
          trip_id?: string;
          updated_at?: string;
          uploaded_by?: string;
          width?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "photos_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "photos_activity_id_fkey";
            columns: ["activity_id"];
            isOneToOne: false;
            referencedRelation: "activities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "photos_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      comments: {
        Row: {
          activity_id: string | null;
          author_id: string;
          body: string;
          created_at: string;
          deleted_at: string | null;
          id: string;
          photo_id: string | null;
          trip_id: string;
          updated_at: string;
        };
        Insert: {
          activity_id?: string | null;
          author_id: string;
          body: string;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          photo_id?: string | null;
          trip_id: string;
          updated_at?: string;
        };
        Update: {
          activity_id?: string | null;
          author_id?: string;
          body?: string;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          photo_id?: string | null;
          trip_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "comments_trip_id_fkey";
            columns: ["trip_id"];
            isOneToOne: false;
            referencedRelation: "trips";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_photo_id_fkey";
            columns: ["photo_id"];
            isOneToOne: false;
            referencedRelation: "photos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_activity_id_fkey";
            columns: ["activity_id"];
            isOneToOne: false;
            referencedRelation: "activities";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      accept_trip_invite: {
        Args: { p_token_hash: string };
        Returns: string;
      };
      create_trip: {
        Args: {
          p_cover_path?: string | null;
          p_default_timezone: string;
          p_description?: string | null;
          p_destination: string;
          p_end_date: string;
          p_name: string;
          p_start_date: string;
        };
        Returns: Database["public"]["Tables"]["trips"]["Row"];
      };
      create_trip_invite: {
        Args: {
          p_expires_at: string;
          p_invited_email?: string | null;
          p_max_uses?: number;
          p_role?: Database["public"]["Enums"]["trip_role"];
          p_token_hash: string;
          p_trip_id: string;
        };
        Returns: Database["public"]["Tables"]["trip_invites"]["Row"];
      };
      set_trip_deleted: {
        Args: { p_deleted: boolean; p_trip_id: string };
        Returns: Database["public"]["Tables"]["trips"]["Row"];
      };
      set_trip_status: {
        Args: {
          p_status: Database["public"]["Enums"]["trip_status"];
          p_trip_id: string;
        };
        Returns: Database["public"]["Tables"]["trips"]["Row"];
      };
      soft_delete_activity: {
        Args: { p_activity_id: string; p_trip_id: string };
        Returns: boolean;
      };
      soft_delete_comment: {
        Args: { p_comment_id: string; p_trip_id: string };
        Returns: boolean;
      };
      soft_delete_photo: {
        Args: { p_photo_id: string; p_trip_id: string };
        Returns: boolean;
      };
      transfer_trip_ownership: {
        Args: {
          p_new_owner_id: string;
          p_previous_owner_role?: Database["public"]["Enums"]["trip_role"];
          p_trip_id: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      activity_status: "planned" | "done" | "cancelled";
      trip_role: "owner" | "admin" | "member";
      trip_status: "planning" | "active" | "completed";
    };
    CompositeTypes: Record<string, never>;
  };
};

type PublicSchema = Database[Extract<keyof Database, "public">];

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends (PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  PublicTableNameOrOptions extends
    keyof PublicSchema["Tables"] | { schema: keyof Database },
  TableName extends (PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  PublicTableNameOrOptions extends
    keyof PublicSchema["Tables"] | { schema: keyof Database },
  TableName extends (PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  PublicEnumNameOrOptions extends
    keyof PublicSchema["Enums"] | { schema: keyof Database },
  EnumName extends (PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never;
