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
          created_at?: string;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          product_id: string;
          status: 'pending' | 'paid' | 'shipped';
          tracking_number: string | null;
          customer_email: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          status?: 'pending' | 'paid' | 'shipped';
          tracking_number?: string | null;
          customer_email?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          status?: 'pending' | 'paid' | 'shipped';
          tracking_number?: string | null;
          customer_email?: string | null;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
