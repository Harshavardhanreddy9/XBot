import dotenv from 'dotenv';
import { collectAllItems, collectedItemToDbItem, getCollectionStats } from './collector.js';
import { extractFullText } from './extract.js';
import { upsertItem, getItemsSince } from './db.js';
import { clusterCandidates } from './events/detect.js';
import { extractFacts, computeDeltas } from './enrich.js';
import { buildThread } from './publish/thread.js';
import { postThreadWithSafeguards } from './publish/post.js';
import { Item, Event, Tweet } from './schema.js';
import { startHealthServer } from './health.js';
import { shouldSkip, getSafetyStats } from './safety.js';

// Load environment variables
dotenv.config();

/**
 * Pipeline configuration
 */
export interface PipelineConfig {
  testMode?: boolean;
  hoursBack?: number;
  maxClustersPerRun?: number;
  enablePosting?: boolean;
  maxDailyPosts?: number;
}

const DEFAULT_CONFIG: Required<PipelineConfig> = {
  testMode: process.env.TEST_MODE === 'true',
  hoursBack: 48,
  maxClustersPerRun: 3,
  enablePosting: process.env.TEST_MODE !== 'true',
  maxDailyPosts: 5
};

/**
 * Pipeline execution result
 */
export interface PipelineResult {
  success: boolean;
  itemsProcessed: number;
  clustersFound: number;
  eventsCreated: number;
  threadsPosted: number;
  errors: string[];
  duration: number;
}

/**
 * Convert collected item to database Item format with extracted text
 */
function collectedItemToDbItemWithText(collectedItem: any, extractedText: string): Item {
  return {
    id: collectedItem.id,
    source: collectedItem.source,
    vendor: collectedItem.vendor,
    product: collectedItem.product,
    url: collectedItem.url,
    title: collectedItem.title,
    summary: collectedItem.summary || collectedItem.title,
    publishedAt: collectedItem.publishedAt,
    text: extractedText,
    raw: collectedItem.raw
  };
}

/**
 * Step 1: Collect items from all sources and extract full text
 */
async function collectAndExtractItems(): Promise<{ items: Item[]; errors: string[] }> {
  console.log('📰 Step 1: Collecting items from all sources and extracting content...');
  console.log('='.repeat(60));
  
  const items: Item[] = [];
  const errors: string[] = [];
  
  try {
    // Collect items from all sources (RSS + GitHub)
    const collectedItems = await collectAllItems();
    console.log(`📊 Collected ${collectedItems.length} items from all sources`);
    
    if (collectedItems.length === 0) {
      console.log('⚠️ No items found from any source');
      return { items, errors };
    }
    
    // Show collection statistics
    const stats = getCollectionStats(collectedItems);
    console.log(`📈 Collection stats: ${stats.rss} RSS, ${stats.github} GitHub releases`);
    
    // Process each collected item
    for (let i = 0; i < collectedItems.length; i++) {
      const collectedItem = collectedItems[i];
      console.log(`\n📄 Processing ${i + 1}/${collectedItems.length}: ${collectedItem.title}`);
      console.log(`🔗 URL: ${collectedItem.url}`);
      console.log(`📊 Source: ${collectedItem.source}${collectedItem.vendor ? ` (${collectedItem.vendor})` : ''}`);
      
      try {
        // For GitHub releases, we already have the content in the release body
        // For RSS items, we need to extract full text from URL
        let extractedText = collectedItem.text || collectedItem.title;
        
        if (collectedItem.source === 'rss' && collectedItem.url) {
          // Extract full text from URL for RSS items
          const extracted = await extractFullText(collectedItem.url);
          
          if (extracted.success && extracted.text.length > 100) {
            extractedText = extracted.text;
            console.log(`✅ Extracted ${extractedText.length} chars from URL`);
          } else {
            console.log(`⚠️ Extraction failed or insufficient content: ${extracted.text.length} chars`);
            extractedText = extracted.text || collectedItem.title;
          }
        } else if (collectedItem.source === 'github') {
          console.log(`✅ Using GitHub release body: ${extractedText.length} chars`);
        }
        
        // Convert to database item format
        const dbItem = collectedItemToDbItemWithText(collectedItem, extractedText);
        
        // Upsert to database
        await upsertItem(dbItem);
        items.push(dbItem);
        
        console.log(`💾 Upserted item: ${dbItem.id}`);
        
      } catch (error) {
        const errorMsg = `Failed to process ${collectedItem.url}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(`❌ ${errorMsg}`);
        errors.push(errorMsg);
        
        // Still upsert with basic info
        try {
          const dbItem = collectedItemToDbItemWithText(collectedItem, collectedItem.title);
          await upsertItem(dbItem);
          items.push(dbItem);
        } catch (upsertError) {
          console.error(`❌ Failed to upsert basic item: ${upsertError}`);
        }
      }
    }
    
    console.log(`\n📊 Step 1 Complete:`);
    console.log(`   Items processed: ${items.length}`);
    console.log(`   Errors: ${errors.length}`);
    
  } catch (error) {
    const errorMsg = `Failed to collect items: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error(`❌ ${errorMsg}`);
    errors.push(errorMsg);
  }
  
  return { items, errors };
}

/**
 * Step 2: Cluster candidates and detect events
 */
async function detectEvents(hoursBack: number): Promise<{ clusters: any[]; errors: string[] }> {
  console.log('\n🔍 Step 2: Detecting events from recent items...');
  console.log('='.repeat(60));
  
  const errors: string[] = [];
  
  try {
    // Get recent items
    const recentItems = await getItemsSince(hoursBack);
    console.log(`📊 Found ${recentItems.length} items from last ${hoursBack} hours`);
    
    if (recentItems.length === 0) {
      console.log('⚠️ No recent items found for event detection');
      return { clusters: [], errors };
    }
    
    // Cluster candidates
    const clusters = await clusterCandidates(recentItems);
    console.log(`🔍 Found ${clusters.length} candidate clusters`);
    
    if (clusters.length === 0) {
      console.log('⚠️ No clusters found');
      return { clusters: [], errors };
    }
    
    // Log cluster details
    clusters.forEach((cluster, index) => {
      console.log(`\n📊 Cluster ${index + 1}:`);
      console.log(`   Vendor: ${cluster.vendor || 'Unknown'}`);
      console.log(`   Product: ${cluster.product || 'Unknown'}`);
      console.log(`   Items: ${cluster.itemIds.length}`);
      console.log(`   Confidence: ${cluster.confidence?.toFixed(2) || 'N/A'}`);
    });
    
    return { clusters, errors };
    
  } catch (error) {
    const errorMsg = `Failed to detect events: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error(`❌ ${errorMsg}`);
    errors.push(errorMsg);
    return { clusters: [], errors };
  }
}

/**
 * Step 3: Process clusters and create events
 */
async function processClusters(
  clusters: any[],
  config: PipelineConfig
): Promise<{ eventsCreated: number; threadsPosted: number; errors: string[] }> {
  console.log('\n⚙️ Step 3: Processing clusters and creating events...');
  console.log('='.repeat(60));
  
  let eventsCreated = 0;
  let threadsPosted = 0;
  const errors: string[] = [];
  
  const maxClusters = config.maxClustersPerRun || DEFAULT_CONFIG.maxClustersPerRun;
  const clustersToProcess = clusters.slice(0, maxClusters);
  
  console.log(`📊 Processing ${clustersToProcess.length} clusters (max ${maxClusters})`);
  
  for (let i = 0; i < clustersToProcess.length; i++) {
    const cluster = clustersToProcess[i];
    console.log(`\n🔄 Processing cluster ${i + 1}/${clustersToProcess.length}:`);
    console.log(`   Vendor: ${cluster.vendor}`);
    console.log(`   Product: ${cluster.product}`);
    console.log(`   Items: ${cluster.itemIds.length}`);
    
    try {
      // Get cluster items
      const clusterItems = await getItemsSince(48); // Get all recent items
      const filteredItems = clusterItems.filter(item => 
        cluster.itemIds.includes(item.id)
      );
      
      if (filteredItems.length === 0) {
        console.log('⚠️ No items found for cluster');
        continue;
      }
      
      console.log(`📄 Processing ${filteredItems.length} items for cluster`);
      
      // Extract facts from cluster items
      const facts = await extractFacts(filteredItems);
      console.log(`📊 Extracted facts: ${facts.features.length} features, ${facts.changes.length} changes`);
      
      // Safety check: Should we skip this content?
      const canonicalUrl = filteredItems[0]?.url || '';
      const safetyCheck = await shouldSkip(facts, {
        title: facts.title || filteredItems[0]?.title,
        text: facts.summary || filteredItems[0]?.text,
        url: canonicalUrl,
        dailyPostCount: threadsPosted,
        maxDailyPosts: config.maxDailyPosts || 5
      });
      
      if (safetyCheck.skip) {
        console.log(`🚫 Safety check failed: ${safetyCheck.reason} - ${safetyCheck.details}`);
        continue;
      }
      
      // Compute deltas (for now, we'll use undefined prior facts)
      const priorFacts = undefined; // TODO: Get prior facts from database
      const deltas = await computeDeltas(facts, priorFacts);
      console.log(`📈 Computed deltas: ${deltas.summary}`);
      
      // Check if we have official citations
      const hasOfficialCitations = facts.citations && facts.citations.length > 0;
      console.log(`🔗 Official citations: ${hasOfficialCitations ? 'Yes' : 'No'}`);
      
      if (hasOfficialCitations) {
        // Build thread
        const canonicalUrl = facts.citations[0]; // Use first citation as canonical URL
        const thread = await buildThread(facts, deltas, canonicalUrl);
        
        console.log(`🧵 Built thread: ${thread.tweets.length} tweets, ${thread.totalLength} chars`);
        console.log(`   Draft only: ${thread.draftOnly}`);
        
        if (!thread.draftOnly && config.enablePosting) {
          // Post thread
          const postResult = await postThreadWithSafeguards(thread, facts, {
            testMode: config.testMode
          });
          
          if (postResult.success) {
            threadsPosted++;
            console.log(`✅ Thread posted successfully!`);
            console.log(`   Tweet IDs: ${postResult.tweetIds.join(', ')}`);
          } else {
            console.log(`❌ Thread posting failed: ${postResult.error}`);
            errors.push(`Thread posting failed: ${postResult.error}`);
          }
        } else if (thread.draftOnly) {
          console.log(`⚠️ Thread marked as draft only, skipping posting`);
        } else if (!config.enablePosting) {
          console.log(`🧪 Posting disabled, would have posted thread`);
        }
        
        // TODO: Persist event and tweets to database
        eventsCreated++;
        
      } else {
        console.log(`⚠️ No official citations found, skipping thread creation`);
      }
      
    } catch (error) {
      const errorMsg = `Failed to process cluster ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(`❌ ${errorMsg}`);
      errors.push(errorMsg);
    }
  }
  
  console.log(`\n📊 Step 3 Complete:`);
  console.log(`   Events created: ${eventsCreated}`);
  console.log(`   Threads posted: ${threadsPosted}`);
  console.log(`   Errors: ${errors.length}`);
  
  return { eventsCreated, threadsPosted, errors };
}

/**
 * Main pipeline execution function
 */
export async function main(config: PipelineConfig = {}): Promise<PipelineResult> {
  const startTime = Date.now();
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  console.log('🚀 XBot Pipeline Starting...');
  console.log('='.repeat(60));
  console.log(`📊 Configuration:`);
  console.log(`   Test mode: ${finalConfig.testMode}`);
  console.log(`   Hours back: ${finalConfig.hoursBack}`);
  console.log(`   Max clusters: ${finalConfig.maxClustersPerRun}`);
  console.log(`   Enable posting: ${finalConfig.enablePosting}`);
  console.log('='.repeat(60));
  
  const result: PipelineResult = {
    success: false,
    itemsProcessed: 0,
    clustersFound: 0,
    eventsCreated: 0,
    threadsPosted: 0,
    errors: [],
    duration: 0
  };
  
  try {
    // Step 1: Collect items from all sources and extract content
    const { items, errors: step1Errors } = await collectAndExtractItems();
    result.itemsProcessed = items.length;
    result.errors.push(...step1Errors);
    
    // Step 2: Detect events from recent items
    const { clusters, errors: step2Errors } = await detectEvents(finalConfig.hoursBack);
    result.clustersFound = clusters.length;
    result.errors.push(...step2Errors);
    
    // Step 3: Process clusters and create events
    const { eventsCreated, threadsPosted, errors: step3Errors } = await processClusters(clusters, finalConfig);
    result.eventsCreated = eventsCreated;
    result.threadsPosted = threadsPosted;
    result.errors.push(...step3Errors);
    
    // Determine overall success
    result.success = result.errors.length === 0 || result.threadsPosted > 0;
    
  } catch (error) {
    const errorMsg = `Pipeline execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error(`❌ ${errorMsg}`);
    result.errors.push(errorMsg);
  }
  
  // Calculate duration
  result.duration = Date.now() - startTime;
  
  // Final summary
  console.log('\n🎉 Pipeline Execution Complete!');
  console.log('='.repeat(60));
  console.log(`📊 Results:`);
  console.log(`   Success: ${result.success ? '✅' : '❌'}`);
  console.log(`   Duration: ${(result.duration / 1000).toFixed(2)}s`);
  console.log(`   Items processed: ${result.itemsProcessed}`);
  console.log(`   Clusters found: ${result.clustersFound}`);
  console.log(`   Events created: ${result.eventsCreated}`);
  console.log(`   Threads posted: ${result.threadsPosted}`);
  console.log(`   Errors: ${result.errors.length}`);
  
  if (result.errors.length > 0) {
    console.log('\n❌ Errors encountered:');
    result.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`);
    });
  }
  
  // Get safety statistics
  const safetyStats = await getSafetyStats();
  
  // Health log output for monitoring
  console.log('\n🏥 HEALTH LOG:');
  console.log('='.repeat(40));
  console.log(`TIMESTAMP: ${new Date().toISOString()}`);
  console.log(`STATUS: ${result.success ? 'HEALTHY' : 'UNHEALTHY'}`);
  console.log(`FETCHED_ITEMS: ${result.itemsProcessed}`);
  console.log(`CLUSTERS_FOUND: ${result.clustersFound}`);
  console.log(`EVENTS_CREATED: ${result.eventsCreated}`);
  console.log(`THREADS_POSTED: ${result.threadsPosted}`);
  console.log(`ERRORS: ${result.errors.length}`);
  console.log(`DURATION_MS: ${result.duration}`);
  console.log(`SAFETY_SKIPS: ${safetyStats.totalSkips}`);
  console.log(`SKIP_REASONS: ${Object.keys(safetyStats.skipReasons).length > 0 ? Object.entries(safetyStats.skipReasons).map(([reason, count]) => `${reason}:${count}`).join(',') : 'none'}`);
  console.log('='.repeat(40));
  
  return result;
}

/**
 * Run the pipeline with default configuration
 */
export async function run(): Promise<void> {
  try {
    // Check if running as web service (for Render)
    const isWebService = process.env.NODE_ENV === 'production' && !process.env.CRON_MODE;
    
    if (isWebService) {
      console.log('🌐 Starting as web service with health endpoint...');
      startHealthServer(parseInt(process.env.PORT || '3000', 10));
      
      // Run pipeline once on startup
      console.log('🚀 Running initial pipeline execution...');
      const result = await main();
      
      if (result.success) {
        console.log('\n🎉 Initial pipeline completed successfully!');
      } else {
        console.log('\n⚠️ Initial pipeline completed with errors');
      }
      
      // Keep the server running
      console.log('🔄 Web service running, health endpoint available at /health');
      
    } else {
      // Run as cron job or one-time execution
      const result = await main();
      
      if (result.success) {
        console.log('\n🎉 Pipeline completed successfully!');
      } else {
        console.log('\n⚠️ Pipeline completed with errors');
        process.exit(1);
      }
    }
    
  } catch (error) {
    console.error('❌ Pipeline execution failed:', error);
    process.exit(1);
  }
}

// Run the pipeline if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  run();
}
