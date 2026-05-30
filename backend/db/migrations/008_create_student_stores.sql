-- Migration: 008_create_student_stores
-- Student-run stores: a special type of seller that is a student at FPT

CREATE TABLE IF NOT EXISTS student_stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  store_name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) DEFAULT 'Đồ ăn & Đồ uống',
  student_id VARCHAR(50),              -- Mã sinh viên FPT
  phone VARCHAR(20),
  avatar TEXT,
  banner_image TEXT,
  address TEXT DEFAULT 'KTX FPT Hoà Lạc',
  longitude DOUBLE PRECISION DEFAULT 105.52522,
  latitude DOUBLE PRECISION DEFAULT 21.01354,
  is_active BOOLEAN DEFAULT TRUE,
  is_verified BOOLEAN DEFAULT FALSE,
  rating REAL DEFAULT 5.0,
  total_orders INTEGER DEFAULT 0,
  total_revenue BIGINT DEFAULT 0,
  operating_hours TEXT DEFAULT '08:00 - 22:00',
  vendor_id TEXT,                        -- Link to vendors table for map display
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Menu items for student stores
CREATE TABLE IF NOT EXISTS student_store_menu (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES student_stores(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price INTEGER NOT NULL,
  category VARCHAR(100) DEFAULT 'Món chính',
  image TEXT,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_student_stores_user_id ON student_stores(user_id);
CREATE INDEX IF NOT EXISTS idx_student_stores_vendor_id ON student_stores(vendor_id);
CREATE INDEX IF NOT EXISTS idx_student_store_menu_store_id ON student_store_menu(store_id);
