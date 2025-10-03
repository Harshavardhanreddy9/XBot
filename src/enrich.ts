import { Item } from './schema.js';
import { LLMClient, createLLMClient } from './llm.js';
import { getItemsByVendorProduct } from './db.js';

/**
 * Extracted facts from cluster items
 */
export interface ExtractedFacts {
  vendor: string;
  product: string;
  version?: string;
  title?: string;
  summary?: string;
  features: string[];
  changes: string[];
  prices: string[];
  limits: string[];
  date: string;
  citations: string[];
}

/**
 * Computed deltas from previous facts
 */
export interface ComputedDeltas {
  contextWindow?: string;
  price?: string;
  features?: string[];
  changes?: string[];
  summary: string;
}

/**
 * Composed take on the facts and deltas
 */
export interface ComposedTake {
  impact: string;
  caveats: string;
  vendorNumbers: string[];
  fullText: string;
}

/**
 * Event record for database storage
 */
export interface EventRecord {
  id: string;
  vendor: string;
  product: string;
  kind: 'release' | 'update' | 'announcement' | 'launch';
  version?: string;
  windowStart: string;
  windowEnd: string;
  description?: string;
  facts: string; // JSON string of ExtractedFacts
  metadata?: any;
}

/**
 * Extract verifiable facts from cluster items using LLM
 */
export async function extractFacts(clusterItems: Item[], llmClient?: LLMClient): Promise<ExtractedFacts> {
  const client = llmClient || createLLMClient();
  
  // Sort items by text length and take top 2 sources
  const sortedItems = clusterItems
    .filter(item => item.text && item.text.length > 0)
    .sort((a, b) => (b.text?.length || 0) - (a.text?.length || 0))
    .slice(0, 2);

  if (sortedItems.length === 0) {
    throw new Error('No items with text content found in cluster');
  }

  // Concatenate text from top sources
  const concatenatedText = sortedItems
    .map(item => `Source: ${item.title}\n${item.text}`)
    .join('\n\n---\n\n');

  // Collect all URLs from the cluster
  const allUrls = clusterItems.map(item => item.url);

  const systemPrompt = `Extract only verifiable facts from the text. Return JSON with keys: vendor, product, version, features[], changes[], prices[], limits[], date, citations[] (must be cluster URLs). Omit unknowns.`;

  const userPrompt = `Text to analyze:
${concatenatedText}

Available URLs for citations:
${allUrls.join('\n')}

Extract facts and return as JSON.`;

  try {
    const response = await client.prompt(systemPrompt, userPrompt);
    
    // Parse JSON response
    const facts = JSON.parse(response) as ExtractedFacts;
    
    // Validate required fields
    if (!facts.vendor || !facts.product) {
      throw new Error('Invalid facts: missing vendor or product');
    }

    // Ensure arrays are properly initialized
    facts.features = facts.features || [];
    facts.changes = facts.changes || [];
    facts.prices = facts.prices || [];
    facts.limits = facts.limits || [];
    facts.citations = facts.citations || [];

    // Validate citations are from cluster URLs
    facts.citations = facts.citations.filter(citation => 
      allUrls.some(url => citation.includes(url) || url.includes(citation))
    );

    console.log(`📊 Extracted facts for ${facts.vendor} ${facts.product}:`);
    console.log(`   Version: ${facts.version || 'N/A'}`);
    console.log(`   Features: ${facts.features.length}`);
    console.log(`   Changes: ${facts.changes.length}`);
    console.log(`   Citations: ${facts.citations.length}`);

    return facts;
  } catch (error) {
    console.error('❌ Fact extraction failed:', error);
    throw new Error(`Failed to extract facts: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Compute deltas by comparing with previous facts
 */
export async function computeDeltas(
  facts: ExtractedFacts, 
  priorFacts?: ExtractedFacts,
  llmClient?: LLMClient
): Promise<ComputedDeltas> {
  const client = llmClient || createLLMClient();

  if (!priorFacts) {
    // No prior facts, return basic summary
    return {
      summary: `New ${facts.vendor} ${facts.product} ${facts.version ? `v${facts.version}` : 'announcement'}`,
    };
  }

  const systemPrompt = `Compare the new facts with prior facts and identify key differences. Focus on context window, pricing, features, and significant changes. Return a bullet list of deltas.`;

  const userPrompt = `Prior Facts:
Vendor: ${priorFacts.vendor}
Product: ${priorFacts.product}
Version: ${priorFacts.version || 'N/A'}
Features: ${priorFacts.features.join(', ') || 'None'}
Changes: ${priorFacts.changes.join(', ') || 'None'}
Prices: ${priorFacts.prices.join(', ') || 'None'}
Limits: ${priorFacts.limits.join(', ') || 'None'}
Date: ${priorFacts.date}

New Facts:
Vendor: ${facts.vendor}
Product: ${facts.product}
Version: ${facts.version || 'N/A'}
Features: ${facts.features.join(', ') || 'None'}
Changes: ${facts.changes.join(', ') || 'None'}
Prices: ${facts.prices.join(', ') || 'None'}
Limits: ${facts.limits.join(', ') || 'None'}
Date: ${facts.date}

Identify key differences and changes.`;

  try {
    const response = await client.prompt(systemPrompt, userPrompt);
    
    // Parse the response to extract structured deltas
    const deltas: ComputedDeltas = {
      summary: response,
    };

    // Extract specific deltas using simple pattern matching
    const lines = response.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      
      if (lowerLine.includes('context window') || lowerLine.includes('context')) {
        deltas.contextWindow = line;
      } else if (lowerLine.includes('price') || lowerLine.includes('cost') || lowerLine.includes('$')) {
        deltas.price = line;
      } else if (lowerLine.includes('feature') || lowerLine.includes('capability')) {
        if (!deltas.features) deltas.features = [];
        deltas.features.push(line);
      } else if (lowerLine.includes('change') || lowerLine.includes('update') || lowerLine.includes('improve')) {
        if (!deltas.changes) deltas.changes = [];
        deltas.changes.push(line);
      }
    }

    console.log(`📈 Computed deltas for ${facts.vendor} ${facts.product}:`);
    console.log(`   Context Window: ${deltas.contextWindow || 'N/A'}`);
    console.log(`   Price: ${deltas.price || 'N/A'}`);
    console.log(`   Features: ${deltas.features?.length || 0}`);
    console.log(`   Changes: ${deltas.changes?.length || 0}`);

    return deltas;
  } catch (error) {
    console.error('❌ Delta computation failed:', error);
    return {
      summary: `New ${facts.vendor} ${facts.product} ${facts.version ? `v${facts.version}` : 'announcement'}`,
    };
  }
}

/**
 * Compose a take on the facts and deltas
 */
export async function composeTake(
  facts: ExtractedFacts,
  deltas: ComputedDeltas,
  llmClient?: LLMClient
): Promise<ComposedTake> {
  const client = llmClient || createLLMClient();

  const systemPrompt = `Write one paragraph on impact and caveats. Label vendor numbers as "vendor-reported" when applicable. Be concise but informative.`;

  const userPrompt = `Facts:
Vendor: ${facts.vendor}
Product: ${facts.product}
Version: ${facts.version || 'N/A'}
Features: ${facts.features.join(', ') || 'None'}
Changes: ${facts.changes.join(', ') || 'None'}
Prices: ${facts.prices.join(', ') || 'None'}
Limits: ${facts.limits.join(', ') || 'None'}
Date: ${facts.date}

Deltas:
${deltas.summary}

Write a take on the impact and any caveats.`;

  try {
    const response = await client.prompt(systemPrompt, userPrompt);
    
    // Extract vendor-reported numbers
    const vendorNumbers: string[] = [];
    const vendorNumberPattern = /(\d+(?:\.\d+)?(?:%|x|times|million|billion|k|m|b)?)\s*(?:vendor-reported|reported by vendor|according to vendor)/gi;
    let match;
    while ((match = vendorNumberPattern.exec(response)) !== null) {
      vendorNumbers.push(match[1]);
    }

    const take: ComposedTake = {
      impact: response,
      caveats: '', // Could be extracted separately if needed
      vendorNumbers,
      fullText: response,
    };

    console.log(`📝 Composed take for ${facts.vendor} ${facts.product}:`);
    console.log(`   Length: ${response.length} chars`);
    console.log(`   Vendor numbers: ${vendorNumbers.length}`);

    return take;
  } catch (error) {
    console.error('❌ Take composition failed:', error);
    return {
      impact: `${facts.vendor} ${facts.product} ${facts.version ? `v${facts.version}` : ''} has been announced with new features and capabilities.`,
      caveats: '',
      vendorNumbers: [],
      fullText: `${facts.vendor} ${facts.product} ${facts.version ? `v${facts.version}` : ''} has been announced with new features and capabilities.`,
    };
  }
}

/**
 * Get prior facts for a vendor/product combination
 */
export async function getPriorFacts(vendor: string, product: string): Promise<ExtractedFacts | null> {
  try {
    // Get recent items for this vendor/product
    const recentItems = await getItemsByVendorProduct(vendor, product);
    
    if (recentItems.length === 0) {
      return null;
    }

    // For now, return null - in a real implementation, you'd query the events table
    // for the most recent event with facts for this vendor/product
    return null;
  } catch (error) {
    console.error('❌ Failed to get prior facts:', error);
    return null;
  }
}

/**
 * Persist event record to database
 */
export async function persistEvent(
  facts: ExtractedFacts,
  deltas: ComputedDeltas,
  take: ComposedTake,
  clusterItems: Item[]
): Promise<EventRecord> {
  const eventId = `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const eventRecord: EventRecord = {
    id: eventId,
    vendor: facts.vendor,
    product: facts.product,
    kind: 'release', // Could be determined more intelligently
    version: facts.version,
    windowStart: clusterItems[0]?.publishedAt || new Date().toISOString(),
    windowEnd: clusterItems[clusterItems.length - 1]?.publishedAt || new Date().toISOString(),
    description: take.fullText,
    facts: JSON.stringify(facts),
    metadata: {
      deltas,
      take,
      itemCount: clusterItems.length,
      itemIds: clusterItems.map(item => item.id),
    },
  };

  // In a real implementation, you'd save this to the database
  console.log(`💾 Event record created: ${eventId}`);
  console.log(`   Vendor: ${eventRecord.vendor}`);
  console.log(`   Product: ${eventRecord.product}`);
  console.log(`   Version: ${eventRecord.version || 'N/A'}`);
  console.log(`   Items: ${eventRecord.metadata?.itemCount || 0}`);

  return eventRecord;
}

/**
 * Complete enrichment pipeline: facts → deltas → take
 */
export async function enrichCluster(
  clusterItems: Item[],
  llmClient?: LLMClient
): Promise<{
  facts: ExtractedFacts;
  deltas: ComputedDeltas;
  take: ComposedTake;
  eventRecord: EventRecord;
}> {
  console.log(`🔍 Starting enrichment for ${clusterItems.length} items`);
  
  // Step 1: Extract facts
  console.log('📊 Extracting facts...');
  const facts = await extractFacts(clusterItems, llmClient);
  
  // Step 2: Get prior facts and compute deltas
  console.log('📈 Computing deltas...');
  const priorFacts = await getPriorFacts(facts.vendor, facts.product);
  const deltas = await computeDeltas(facts, priorFacts || undefined, llmClient);
  
  // Step 3: Compose take
  console.log('📝 Composing take...');
  const take = await composeTake(facts, deltas, llmClient);
  
  // Step 4: Persist event record
  console.log('💾 Persisting event record...');
  const eventRecord = await persistEvent(facts, deltas, take, clusterItems);
  
  console.log('✅ Enrichment pipeline completed');
  
  return {
    facts,
    deltas,
    take,
    eventRecord,
  };
}
