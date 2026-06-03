-- Migration: 009_create_community_reviews
-- Community reviews, upvotes, and reports

CREATE TABLE IF NOT EXISTS community_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  review_type VARCHAR(50) NOT NULL, -- 'vendor' (for regular restaurants), 'student_store' (for student stalls), or 'dish' (for menu items)
  vendor_id TEXT, -- optional reference to vendors(id)
  student_store_id UUID REFERENCES student_stores(id) ON DELETE CASCADE, -- optional reference to student_stores(id)
  dish_name VARCHAR(255), -- name of the dish being reviewed (for both vendor dishes or student store dishes)
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  content TEXT NOT NULL,
  images JSONB DEFAULT '[]'::JSONB, -- array of image URLs
  is_anonymous BOOLEAN DEFAULT FALSE,
  status VARCHAR(50) DEFAULT 'approved', -- 'pending', 'approved', 'hidden', 'deleted'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS review_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES community_reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(review_id, user_id)
);

CREATE TABLE IF NOT EXISTS review_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES community_reviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason VARCHAR(255) NOT NULL, -- 'spam', 'seeding', 'competitor_sabotage', 'false_info', 'offensive', 'sensitive_info', 'fake_account'
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'resolved_keep', 'resolved_hide', 'resolved_delete'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_community_reviews_vendor ON community_reviews(vendor_id);
CREATE INDEX IF NOT EXISTS idx_community_reviews_student_store ON community_reviews(student_store_id);
CREATE INDEX IF NOT EXISTS idx_community_reviews_type ON community_reviews(review_type);
CREATE INDEX IF NOT EXISTS idx_review_votes_review ON review_votes(review_id);
CREATE INDEX IF NOT EXISTS idx_review_reports_review ON review_reports(review_id);
