export interface Database {
  public: {
    Tables: {
      products: {
        Row: {
          id: string;
          slug: string;
          title: string;
          description: string;
          price: number;
          main_image_url: string;
          creem_link: string;
          creem_product_id: string | null;
          cj_vid: string | null;
          cj_logistic_name: string | null;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          description: string;
          price: number;
          main_image_url: string;
          creem_link: string;
          creem_product_id?: string | null;
          cj_vid?: string | null;
          cj_logistic_name?: string | null;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          description?: string;
          price?: number;
          main_image_url?: string;
          creem_link?: string;
          creem_product_id?: string | null;
          cj_vid?: string | null;
          cj_logistic_name?: string | null;
          active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          product_id: string;
          status: 'pending' | 'paid' | 'shipped' | 'delivered';
          tracking_number: string | null;
          customer_email: string | null;
          product_title: string;
          amount_cents: number;
          amount_paid_cents: number | null;
          currency: string;
          creem_product_id: string | null;
          creem_checkout_id: string | null;
          creem_order_id: string | null;
          creem_event_id: string | null;
          checkout_idempotency_key: string | null;
          cj_vid: string | null;
          cj_logistic_name: string | null;
          shipping_email: string | null;
          shipping_customer_name: string | null;
          shipping_phone: string | null;
          shipping_country_code: string | null;
          shipping_country: string | null;
          shipping_province: string | null;
          shipping_city: string | null;
          shipping_county: string | null;
          shipping_address: string | null;
          shipping_address2: string | null;
          shipping_zip: string | null;
          shipping_house_number: string | null;
          cj_fulfillment_order_id: string | null;
          cj_status: string | null;
          cj_tracking_provider: string | null;
          cj_tracking_url: string | null;
          cj_request_id: string | null;
          cj_error: string | null;
          cj_sandbox: boolean | null;
          cj_submission_started_at: string | null;
          cj_submitted_at: string | null;
          cj_last_synced_at: string | null;
          created_at: string;
          paid_at: string | null;
          shipped_at: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          status?: 'pending' | 'paid' | 'shipped' | 'delivered';
          tracking_number?: string | null;
          customer_email?: string | null;
          product_title: string;
          amount_cents: number;
          amount_paid_cents?: number | null;
          currency: string;
          creem_product_id?: string | null;
          creem_checkout_id?: string | null;
          creem_order_id?: string | null;
          creem_event_id?: string | null;
          checkout_idempotency_key?: string | null;
          cj_vid?: string | null;
          cj_logistic_name?: string | null;
          shipping_email?: string | null;
          shipping_customer_name?: string | null;
          shipping_phone?: string | null;
          shipping_country_code?: string | null;
          shipping_country?: string | null;
          shipping_province?: string | null;
          shipping_city?: string | null;
          shipping_county?: string | null;
          shipping_address?: string | null;
          shipping_address2?: string | null;
          shipping_zip?: string | null;
          shipping_house_number?: string | null;
          cj_fulfillment_order_id?: string | null;
          cj_status?: string | null;
          cj_tracking_provider?: string | null;
          cj_tracking_url?: string | null;
          cj_request_id?: string | null;
          cj_error?: string | null;
          cj_sandbox?: boolean | null;
          cj_submission_started_at?: string | null;
          cj_submitted_at?: string | null;
          cj_last_synced_at?: string | null;
          created_at?: string;
          paid_at?: string | null;
          shipped_at?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          status?: 'pending' | 'paid' | 'shipped' | 'delivered';
          tracking_number?: string | null;
          customer_email?: string | null;
          product_title?: string;
          amount_cents?: number;
          amount_paid_cents?: number | null;
          currency?: string;
          creem_product_id?: string | null;
          creem_checkout_id?: string | null;
          creem_order_id?: string | null;
          creem_event_id?: string | null;
          checkout_idempotency_key?: string | null;
          cj_vid?: string | null;
          cj_logistic_name?: string | null;
          shipping_email?: string | null;
          shipping_customer_name?: string | null;
          shipping_phone?: string | null;
          shipping_country_code?: string | null;
          shipping_country?: string | null;
          shipping_province?: string | null;
          shipping_city?: string | null;
          shipping_county?: string | null;
          shipping_address?: string | null;
          shipping_address2?: string | null;
          shipping_zip?: string | null;
          shipping_house_number?: string | null;
          cj_fulfillment_order_id?: string | null;
          cj_status?: string | null;
          cj_tracking_provider?: string | null;
          cj_tracking_url?: string | null;
          cj_request_id?: string | null;
          cj_error?: string | null;
          cj_sandbox?: boolean | null;
          cj_submission_started_at?: string | null;
          cj_submitted_at?: string | null;
          cj_last_synced_at?: string | null;
          created_at?: string;
          paid_at?: string | null;
          shipped_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'orders_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
        ];
      };
      storefront_rate_limits: {
        Row: {
          key: string;
          window_started_at: string;
          request_count: number;
        };
        Insert: {
          key: string;
          window_started_at?: string;
          request_count?: number;
        };
        Update: {
          key?: string;
          window_started_at?: string;
          request_count?: number;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      consume_storefront_rate_limit: {
        Args: {
          p_key: string;
          p_limit: number;
          p_window_seconds: number;
        };
        Returns: boolean;
      };
    };
  };
}
