# Bargain Beacon

Bargain Beacon is a shopping value tracker that compares household products by real value rather than just shelf price.

The current MVP focuses on 3-ply toilet paper. It ranks products using pack price, sheet count, delivery availability, stock status, ratings, and review count to calculate a value score.

## Current Status

This is an early MVP.

Currently implemented:

* Next.js app
* Supabase database
* Relational schema for retailers, products, and price checks
* Imported dataset of real 3-ply toilet paper products
* Value scoring algorithm
* Ranked product table
* Product links to retailer pages

## Tech Stack

* Next.js
* TypeScript
* Tailwind CSS
* Supabase
* Python import script
* Excel seed dataset

## How the Scoring Works

The app calculates value using:

1. Total sheets
   `rolls_per_pack × sheets_per_roll`

2. Price per 100 sheets
   `(price + delivery_fee + small_order_charge) / total_sheets × 100`

3. Quality multiplier

   * Missing rating/reviews: small penalty
   * Fewer than 10 reviews: neutral
   * Rating 4.5+ with enough reviews: small bonus
   * Rating below 3.8: small penalty

4. Adjusted value score
   `price_per_100_sheets × quality_multiplier`

Lower score means better value.

## Database Structure

The app uses three main tables:

* `retailers` — stores retailer names
* `products` — stores product details such as brand, sheet count, ply, and ratings
* `price_checks` — stores price, stock, delivery availability, and check timestamp

This structure allows future support for price history and scheduled scraping.

## Roadmap

Planned features:

* Improved dashboard UI
* Search and filtering by retailer/brand
* Product detail pages
* Price history tracking
* Automated retailer scrapers
* Scheduled daily or weekly scans
* Support for more household product categories

## Long-Term Goal

The long-term goal is to build a value comparison engine for everyday household products, helping users compare products fairly across retailers by normalised unit value rather than misleading pack prices.
