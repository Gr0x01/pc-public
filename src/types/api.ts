/**
 * API request/response types for Next.js route handlers.
 */

import type { RelevanceLevel } from "./enums";

// --------------------------------------------------------------------------
// Generic API response wrapper
// --------------------------------------------------------------------------

export interface ApiSuccess<T> {
  data: T;
  error: null;
}

export interface ApiError {
  data: null;
  error: {
    message: string;
    code?: string;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// --------------------------------------------------------------------------
// Feed / search
// --------------------------------------------------------------------------

export interface FeedItem {
  id: string;
  title: string;
  item_type: string;
  published_date: string;
  source_url: string | null;
  relevance: RelevanceLevel;
  impact_summary: string | null;
}

export interface FeedQuery {
  relevance?: RelevanceLevel;
  limit?: number;
  offset?: number;
}

export interface SearchQuery {
  q: string;
  limit?: number;
}

export interface SearchResult {
  item_id: string;
  title: string;
  published_date: string;
  chunk_content: string;
  score: number;
}

// --------------------------------------------------------------------------
// Pipeline
// --------------------------------------------------------------------------

export interface PipelineRunRequest {
  source: string;
  date_from?: string;
  date_to?: string;
}

export interface PipelineRunResponse {
  run_id: string;
  source: string;
  status: string;
}

// --------------------------------------------------------------------------
// Subscribers
// --------------------------------------------------------------------------

export interface SubscribeRequest {
  email: string;
  source?: string;
}

export interface SubscribeResponse {
  subscriber_id: string;
  email: string;
}

export interface UnsubscribeRequest {
  token: string;
}

// --------------------------------------------------------------------------
// Products
// --------------------------------------------------------------------------

export type { CreateProductInput as AddProductRequest } from "@/lib/products/types";

export interface ProductMatchSummary {
  product_id: string;
  product_name: string;
  regulatory_item_id: string;
  item_title: string;
  published_date: string;
  confidence: number;
  impact_summary: string | null;
}
