-- Add optional barcode support for students
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS barcode TEXT;

-- Optional uniqueness guarantee for non-empty barcode values
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_barcode_unique
  ON students (barcode)
  WHERE barcode IS NOT NULL AND barcode <> '';
