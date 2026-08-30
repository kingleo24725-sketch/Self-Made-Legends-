# Dad + Daughter Beauty Bond™ — a Self-Made Legends LLC (SML) product.
# Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
# Proprietary and confidential. Unauthorized use is prohibited.
#
# Beauty Bond provisions into its OWN cloud account/project — it shares no
# infrastructure with any other SML product. docs/api-reference.md §6.3.

terraform {
  required_version = ">= 1.9"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

variable "environment" {
  type        = string
  description = "dev | staging | production"
}

locals {
  product = "beauty-bond"
  tags = {
    Product   = "Beauty Bond"
    Owner     = "Self-Made Legends LLC (SML)"
    ManagedBy = "terraform"
    Env       = var.environment
  }
}

# Ephemeral try-on uploads: 24h hard TTL, enforced by lifecycle rule rather
# than by application code. docs/ai-tryon.md §4.6 Rule 3.
resource "aws_s3_bucket" "ephemeral_uploads" {
  bucket = "${local.product}-${var.environment}-ephemeral"
  tags   = local.tags
}

resource "aws_s3_bucket_lifecycle_configuration" "ephemeral_expiry" {
  bucket = aws_s3_bucket.ephemeral_uploads.id
  rule {
    id     = "delete-after-24h"
    status = "Enabled"
    expiration { days = 1 }
  }
}

resource "aws_s3_bucket_public_access_block" "ephemeral_private" {
  bucket                  = aws_s3_bucket.ephemeral_uploads.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "ephemeral_sse" {
  bucket = aws_s3_bucket.ephemeral_uploads.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.media.id
    }
  }
}

resource "aws_kms_key" "media" {
  description         = "Beauty Bond media encryption (SML)"
  enable_key_rotation = true
  tags                = local.tags
}

# Saved renders and Bond Book assets.
resource "aws_s3_bucket" "media" {
  bucket = "${local.product}-${var.environment}-media"
  tags   = local.tags
}

resource "aws_s3_bucket_public_access_block" "media_private" {
  bucket                  = aws_s3_bucket.media.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
