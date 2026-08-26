-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "imageHash" TEXT;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "csvHash" TEXT;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "pdfHash" TEXT;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "receiptUrl" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Transaction_userId_imageHash_idx" ON "Transaction"("userId", "imageHash");
CREATE INDEX IF NOT EXISTS "Transaction_userId_csvHash_idx" ON "Transaction"("userId", "csvHash");
CREATE INDEX IF NOT EXISTS "Transaction_userId_pdfHash_idx" ON "Transaction"("userId", "pdfHash");
