import sqlite3 from 'sqlite3';
import path from 'path';
import { Item, Event, Tweet, validateItem } from './schema.js';

/**
 * Database configuration
 */
const DB_PATH = process.env.NODE_ENV === 'test' 
  ? ':memory:' 
  : process.env.RENDER_DISK_PATH 
    ? path.join(process.env.RENDER_DISK_PATH, 'xbot.db')
    : path.join(process.cwd(), 'data', 'xbot.db');

/**
 * Database instance
 */
let db: sqlite3.Database | null = null;

/**
 * Promise wrapper for sqlite3 operations
 */
function promisify<T>(fn: (callback: (err: Error | null, result?: T) => void) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    fn((err, result) => {
      if (err) reject(err);
      else resolve(result!);
    });
  });
}

/**
 * Initialize database connection and create tables
 */
function initializeDatabase(): sqlite3.Database {
  if (db) {
    return db;
  }

  // Ensure data directory exists
  const dataDir = path.dirname(DB_PATH);
  try {
    require('fs').mkdirSync(dataDir, { recursive: true });
    console.log(`📁 Created data directory: ${dataDir}`);
  } catch (error) {
    console.log(`📁 Data directory already exists: ${dataDir}`);
  }

  db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      console.error('❌ Error opening database:', err);
      throw err;
    }
    console.log(`📊 Database initialized: ${DB_PATH}`);
  });
  
  // Create tables
  createTables();
  
  return db;
}

/**
 * Create database tables
 */
function createTables(): void {
  if (!db) throw new Error('Database not initialized');

  const createTablesSQL = `
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL CHECK (source IN ('rss', 'web', 'github', 'x')),
      vendor TEXT,
      product TEXT,
      url TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      summary TEXT,
      text TEXT,
      publishedAt TEXT NOT NULL,
      raw TEXT,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      vendor TEXT NOT NULL,
      product TEXT NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('release', 'update', 'announcement', 'launch')),
      version TEXT,
      windowStart TEXT NOT NULL,
      windowEnd TEXT NOT NULL,
      description TEXT,
      metadata TEXT,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tweets (
      id TEXT PRIMARY KEY,
      eventId TEXT,
      content TEXT NOT NULL,
      url TEXT,
      postedAt TEXT NOT NULL,
      threadJson TEXT,
      likes INTEGER DEFAULT 0,
      retweets INTEGER DEFAULT 0,
      replies INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (eventId) REFERENCES events(id)
    );

    CREATE TABLE IF NOT EXISTS skip_reasons (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      reason TEXT NOT NULL,
      details TEXT NOT NULL,
      metadata TEXT,
      timestamp TEXT DEFAULT (datetime('now')),
      createdAt TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_items_source ON items(source);
    CREATE INDEX IF NOT EXISTS idx_items_vendor ON items(vendor);
    CREATE INDEX IF NOT EXISTS idx_items_product ON items(product);
    CREATE INDEX IF NOT EXISTS idx_items_publishedAt ON items(publishedAt);
    CREATE INDEX IF NOT EXISTS idx_items_url ON items(url);
    
    CREATE INDEX IF NOT EXISTS idx_events_vendor ON events(vendor);
    CREATE INDEX IF NOT EXISTS idx_events_product ON events(product);
    CREATE INDEX IF NOT EXISTS idx_events_windowStart ON events(windowStart);
    
    CREATE INDEX IF NOT EXISTS idx_tweets_eventId ON tweets(eventId);
    CREATE INDEX IF NOT EXISTS idx_tweets_postedAt ON tweets(postedAt);
    
    CREATE INDEX IF NOT EXISTS idx_skip_reasons_reason ON skip_reasons(reason);
    CREATE INDEX IF NOT EXISTS idx_skip_reasons_timestamp ON skip_reasons(timestamp);
  `;

  db.exec(createTablesSQL, (err) => {
    if (err) {
      console.error('❌ Error creating tables:', err);
    } else {
      console.log('✅ Database tables created/verified');
    }
  });
}

/**
 * Get database instance
 */
function getDatabase(): sqlite3.Database {
  if (!db) {
    return initializeDatabase();
  }
  return db;
}

/**
 * Upsert an item (insert or update)
 */
export function upsertItem(item: Item): Promise<void> {
  const database = getDatabase();
  
  // Validate item
  const validatedItem = validateItem(item);
  
  return new Promise((resolve, reject) => {
    const stmt = database.prepare(`
      INSERT INTO items (
        id, source, vendor, product, url, title, summary, text, publishedAt, raw, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(url) DO UPDATE SET
        title = excluded.title,
        summary = excluded.summary,
        text = excluded.text,
        vendor = excluded.vendor,
        product = excluded.product,
        updatedAt = datetime('now')
    `);
    
    stmt.run([
      validatedItem.id,
      validatedItem.source,
      validatedItem.vendor || null,
      validatedItem.product || null,
      validatedItem.url,
      validatedItem.title,
      validatedItem.summary || null,
      validatedItem.text || null,
      validatedItem.publishedAt,
      validatedItem.raw ? JSON.stringify(validatedItem.raw) : null
    ], (err) => {
      if (err) {
        reject(err);
      } else {
        console.log(`📝 Upserted item: ${validatedItem.title} (${validatedItem.source})`);
        resolve();
      }
    });
    
    stmt.finalize();
  });
}

/**
 * Get items since a certain number of hours ago
 */
export function getItemsSince(hours: number): Promise<Item[]> {
  const database = getDatabase();
  
  const cutoffTime = new Date();
  cutoffTime.setHours(cutoffTime.getHours() - hours);
  const cutoffISO = cutoffTime.toISOString();
  
  return new Promise((resolve, reject) => {
    database.all(`
      SELECT * FROM items 
      WHERE publishedAt >= ? 
      ORDER BY publishedAt DESC
    `, [cutoffISO], (err, rows: any[]) => {
      if (err) {
        reject(err);
      } else {
        const items = rows.map(row => ({
          id: row.id,
          source: row.source,
          vendor: row.vendor,
          product: row.product,
          url: row.url,
          title: row.title,
          summary: row.summary,
          publishedAt: row.publishedAt,
          text: row.text,
          raw: row.raw ? JSON.parse(row.raw) : undefined
        }));
        resolve(items);
      }
    });
  });
}

/**
 * Get items by vendor and product
 */
export function getItemsByVendorProduct(vendor: string, product?: string): Promise<Item[]> {
  const database = getDatabase();
  
  let query = 'SELECT * FROM items WHERE vendor = ?';
  let params: any[] = [vendor];
  
  if (product) {
    query += ' AND product = ?';
    params.push(product);
  }
  
  query += ' ORDER BY publishedAt DESC';
  
  return new Promise((resolve, reject) => {
    database.all(query, params, (err, rows: any[]) => {
      if (err) {
        reject(err);
      } else {
        const items = rows.map(row => ({
          id: row.id,
          source: row.source,
          vendor: row.vendor,
          product: row.product,
          url: row.url,
          title: row.title,
          summary: row.summary,
          publishedAt: row.publishedAt,
          text: row.text,
          raw: row.raw ? JSON.parse(row.raw) : undefined
        }));
        resolve(items);
      }
    });
  });
}

/**
 * Get recent items by source
 */
export function getRecentItemsBySource(source: string, limit: number = 50): Promise<Item[]> {
  const database = getDatabase();
  
  return new Promise((resolve, reject) => {
    database.all(`
      SELECT * FROM items 
      WHERE source = ? 
      ORDER BY publishedAt DESC 
      LIMIT ?
    `, [source, limit], (err, rows: any[]) => {
      if (err) {
        reject(err);
      } else {
        const items = rows.map(row => ({
          id: row.id,
          source: row.source,
          vendor: row.vendor,
          product: row.product,
          url: row.url,
          title: row.title,
          summary: row.summary,
          publishedAt: row.publishedAt,
          text: row.text,
          raw: row.raw ? JSON.parse(row.raw) : undefined
        }));
        resolve(items);
      }
    });
  });
}

/**
 * Create an event
 */
export function createEvent(event: Event): Promise<void> {
  const database = getDatabase();
  
  return new Promise((resolve, reject) => {
    const stmt = database.prepare(`
      INSERT INTO events (
        id, vendor, product, kind, version, windowStart, windowEnd, description, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run([
      event.id,
      event.vendor,
      event.product,
      event.kind,
      event.version || null,
      event.windowStart,
      event.windowEnd,
      event.description || null,
      event.metadata ? JSON.stringify(event.metadata) : null
    ], (err) => {
      if (err) {
        reject(err);
      } else {
        console.log(`📅 Created event: ${event.vendor} ${event.product} ${event.kind}`);
        resolve();
      }
    });
    
    stmt.finalize();
  });
}

/**
 * Record a posted tweet
 */
export function recordTweet(tweet: Tweet): Promise<void> {
  const database = getDatabase();
  
  return new Promise((resolve, reject) => {
    const stmt = database.prepare(`
      INSERT INTO tweets (
        id, eventId, content, url, postedAt, threadJson, likes, retweets, replies
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run([
      tweet.id,
      tweet.eventId || null,
      tweet.content,
      tweet.url || null,
      tweet.postedAt,
      tweet.threadJson || null,
      tweet.metrics?.likes || 0,
      tweet.metrics?.retweets || 0,
      tweet.metrics?.replies || 0
    ], (err) => {
      if (err) {
        reject(err);
      } else {
        console.log(`🐦 Recorded tweet: ${tweet.id}`);
        resolve();
      }
    });
    
    stmt.finalize();
  });
}

/**
 * Get database statistics
 */
export function getDatabaseStats(): Promise<{
  totalItems: number;
  itemsBySource: Record<string, number>;
  itemsByVendor: Record<string, number>;
  recentItems: number;
  totalTweets: number;
}> {
  const database = getDatabase();
  
  return new Promise((resolve, reject) => {
    // Get all stats in parallel
    const promises = [
      promisify<{ count: number }>((cb) => database.get('SELECT COUNT(*) as count FROM items', cb)),
      promisify<any[]>((cb) => database.all('SELECT source, COUNT(*) as count FROM items GROUP BY source', cb)),
      promisify<any[]>((cb) => database.all('SELECT vendor, COUNT(*) as count FROM items WHERE vendor IS NOT NULL GROUP BY vendor', cb)),
      promisify<{ count: number }>((cb) => {
        const cutoffTime = new Date();
        cutoffTime.setHours(cutoffTime.getHours() - 24);
        database.get('SELECT COUNT(*) as count FROM items WHERE publishedAt >= ?', [cutoffTime.toISOString()], cb);
      }),
      promisify<{ count: number }>((cb) => database.get('SELECT COUNT(*) as count FROM tweets', cb))
    ];
    
    Promise.all(promises).then(([totalItems, sourceStats, vendorStats, recentItems, totalTweets]) => {
      const itemsBySource = (sourceStats as any[]).reduce((acc: Record<string, number>, row: any) => {
        acc[row.source] = row.count;
        return acc;
      }, {} as Record<string, number>);
      
      const itemsByVendor = (vendorStats as any[]).reduce((acc: Record<string, number>, row: any) => {
        acc[row.vendor] = row.count;
        return acc;
      }, {} as Record<string, number>);
      
      resolve({
        totalItems: (totalItems as any).count,
        itemsBySource,
        itemsByVendor,
        recentItems: (recentItems as any).count,
        totalTweets: (totalTweets as any).count
      });
    }).catch(reject);
  });
}

/**
 * Record a skip reason
 */
export function upsertSkipReason(skipReason: {
  reason: string;
  details: string;
  metadata?: string;
  timestamp?: string;
}): Promise<void> {
  const database = getDatabase();
  
  return new Promise((resolve, reject) => {
    const stmt = database.prepare(`
      INSERT INTO skip_reasons (
        reason, details, metadata, timestamp
      ) VALUES (?, ?, ?, ?)
    `);
    
    stmt.run([
      skipReason.reason,
      skipReason.details,
      skipReason.metadata || null,
      skipReason.timestamp || new Date().toISOString()
    ], (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
    
    stmt.finalize();
  });
}

/**
 * Get skip reasons statistics
 */
export function getSkipReasonStats(): Promise<{
  totalSkips: number;
  skipReasons: Record<string, number>;
  recentSkips: Array<{ reason: string; details: string; timestamp: string }>;
}> {
  const database = getDatabase();
  
  return new Promise((resolve, reject) => {
    const promises = [
      promisify<{ count: number }>((cb) => database.get('SELECT COUNT(*) as count FROM skip_reasons', cb)),
      promisify<any[]>((cb) => database.all('SELECT reason, COUNT(*) as count FROM skip_reasons GROUP BY reason', cb)),
      promisify<any[]>((cb) => database.all('SELECT reason, details, timestamp FROM skip_reasons ORDER BY timestamp DESC LIMIT 10', cb))
    ];
    
    Promise.all(promises).then(([totalSkips, reasonStats, recentSkips]) => {
      const skipReasons = (reasonStats as any[]).reduce((acc: Record<string, number>, row: any) => {
        acc[row.reason] = row.count;
        return acc;
      }, {} as Record<string, number>);
      
      resolve({
        totalSkips: (totalSkips as any).count,
        skipReasons,
        recentSkips: (recentSkips as any[]).map(row => ({
          reason: row.reason,
          details: row.details,
          timestamp: row.timestamp
        }))
      });
    }).catch(reject);
  });
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close((err) => {
      if (err) {
        console.error('❌ Error closing database:', err);
      } else {
        console.log('📊 Database connection closed');
      }
    });
    db = null;
  }
}

/**
 * Initialize database on module load
 */
initializeDatabase();