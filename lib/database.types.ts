export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      fare_types: {
        Row: {
          id: string
          name: string
          surcharge_percentage: number
        }
        Insert: {
          id?: string
          name: string
          surcharge_percentage?: number
        }
        Update: {
          id?: string
          name?: string
          surcharge_percentage?: number
        }
        Relationships: []
      }
      food_bookings: {
        Row: {
          date: string
          guests_count: number
          id: string
          meal_type: Database["public"]["Enums"]["meal_type"]
          menu_id: string
          reservation_id: string
          total_price: number
        }
        Insert: {
          date: string
          guests_count: number
          id?: string
          meal_type: Database["public"]["Enums"]["meal_type"]
          menu_id: string
          reservation_id: string
          total_price: number
        }
        Update: {
          date?: string
          guests_count?: number
          id?: string
          meal_type?: Database["public"]["Enums"]["meal_type"]
          menu_id?: string
          reservation_id?: string
          total_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "food_bookings_menu_id_fkey"
            columns: ["menu_id"]
            isOneToOne: false
            referencedRelation: "food_menus"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_bookings_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      food_menus: {
        Row: {
          id: string
          meal_type: Database["public"]["Enums"]["meal_type"]
          name: string
          price_per_person: number
        }
        Insert: {
          id?: string
          meal_type: Database["public"]["Enums"]["meal_type"]
          name: string
          price_per_person: number
        }
        Update: {
          id?: string
          meal_type?: Database["public"]["Enums"]["meal_type"]
          name?: string
          price_per_person?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          apellido_materno: string | null
          apellido_paterno: string
          created_at: string
          date_of_birth: string | null
          document_id: string | null
          email: string
          first_name: string
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["role_type"]
          status: Database["public"]["Enums"]["profile_status"]
          updated_at: string
        }
        Insert: {
          apellido_materno?: string | null
          apellido_paterno: string
          created_at?: string
          date_of_birth?: string | null
          document_id?: string | null
          email: string
          first_name: string
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["role_type"]
          status?: Database["public"]["Enums"]["profile_status"]
          updated_at?: string
        }
        Update: {
          apellido_materno?: string | null
          apellido_paterno?: string
          created_at?: string
          date_of_birth?: string | null
          document_id?: string | null
          email?: string
          first_name?: string
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["role_type"]
          status?: Database["public"]["Enums"]["profile_status"]
          updated_at?: string
        }
        Relationships: []
      }
      property_settings: {
        Row: {
          id: string
          nightly_rate: number
          security_deposit: number
        }
        Insert: {
          id?: string
          nightly_rate: number
          security_deposit: number
        }
        Update: {
          id?: string
          nightly_rate?: number
          security_deposit?: number
        }
        Relationships: []
      }
      reservations: {
        Row: {
          check_in: string
          check_out: string
          created_at: string
          deleted_at: string | null
          fare_type_id: string
          guest_id: string
          id: string
          payment_status: Database["public"]["Enums"]["payment_status_type"]
          status: Database["public"]["Enums"]["reservation_status"]
          total_amount: number
          updated_at: string
        }
        Insert: {
          check_in: string
          check_out: string
          created_at?: string
          deleted_at?: string | null
          fare_type_id: string
          guest_id: string
          id?: string
          payment_status?: Database["public"]["Enums"]["payment_status_type"]
          status?: Database["public"]["Enums"]["reservation_status"]
          total_amount: number
          updated_at?: string
        }
        Update: {
          check_in?: string
          check_out?: string
          created_at?: string
          deleted_at?: string | null
          fare_type_id?: string
          guest_id?: string
          id?: string
          payment_status?: Database["public"]["Enums"]["payment_status_type"]
          status?: Database["public"]["Enums"]["reservation_status"]
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_fare_type_id_fkey"
            columns: ["fare_type_id"]
            isOneToOne: false
            referencedRelation: "fare_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      spa_bookings: {
        Row: {
          date: string
          id: string
          masseuse_id: string
          price_per_hour: number
          reservation_id: string
          time: string
        }
        Insert: {
          date: string
          id?: string
          masseuse_id: string
          price_per_hour: number
          reservation_id: string
          time: string
        }
        Update: {
          date?: string
          id?: string
          masseuse_id?: string
          price_per_hour?: number
          reservation_id?: string
          time?: string
        }
        Relationships: [
          {
            foreignKeyName: "spa_bookings_masseuse_id_fkey"
            columns: ["masseuse_id"]
            isOneToOne: false
            referencedRelation: "spa_masseuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spa_bookings_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      spa_masseuses: {
        Row: {
          id: string
          name: string
          status: Database["public"]["Enums"]["profile_status"]
        }
        Insert: {
          id?: string
          name: string
          status?: Database["public"]["Enums"]["profile_status"]
        }
        Update: {
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["profile_status"]
        }
        Relationships: []
      }
      wine_order_items: {
        Row: {
          id: string
          quantity: number
          unit_price: number
          wine_id: string | null
          wine_order_id: string
          wine_package_id: string | null
        }
        Insert: {
          id?: string
          quantity: number
          unit_price: number
          wine_id?: string | null
          wine_order_id: string
          wine_package_id?: string | null
        }
        Update: {
          id?: string
          quantity?: number
          unit_price?: number
          wine_id?: string | null
          wine_order_id?: string
          wine_package_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wine_order_items_wine_id_fkey"
            columns: ["wine_id"]
            isOneToOne: false
            referencedRelation: "wines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wine_order_items_wine_order_id_fkey"
            columns: ["wine_order_id"]
            isOneToOne: false
            referencedRelation: "wine_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wine_order_items_wine_package_id_fkey"
            columns: ["wine_package_id"]
            isOneToOne: false
            referencedRelation: "wine_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      wine_orders: {
        Row: {
          id: string
          reservation_id: string
          total_price: number
        }
        Insert: {
          id?: string
          reservation_id: string
          total_price: number
        }
        Update: {
          id?: string
          reservation_id?: string
          total_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "wine_orders_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      wine_packages: {
        Row: {
          id: string
          name: string
          price: number
        }
        Insert: {
          id?: string
          name: string
          price: number
        }
        Update: {
          id?: string
          name?: string
          price?: number
        }
        Relationships: []
      }
      wines: {
        Row: {
          id: string
          name: string
          price: number
          stock: number
          type: string
        }
        Insert: {
          id?: string
          name: string
          price: number
          stock?: number
          type: string
        }
        Update: {
          id?: string
          name?: string
          price?: number
          stock?: number
          type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      meal_type: "Desayuno" | "Almuerzo" | "Cena"
      payment_status_type:
        | "pendiente"
        | "parcial"
        | "completado"
        | "reembolsado"
      profile_status: "activo" | "invitado"
      reservation_status:
        | "pendiente"
        | "confirmada"
        | "cancelada"
        | "finalizada"
      role_type: "admin" | "holder" | "guest"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      meal_type: ["Desayuno", "Almuerzo", "Cena"],
      payment_status_type: [
        "pendiente",
        "parcial",
        "completado",
        "reembolsado",
      ],
      profile_status: ["activo", "invitado"],
      reservation_status: [
        "pendiente",
        "confirmada",
        "cancelada",
        "finalizada",
      ],
      role_type: ["admin", "holder", "guest"],
    },
  },
} as const

