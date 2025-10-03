import { main, run, PipelineResult } from '../src/run.js';

/**
 * Simple assertion function for testing
 */
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`❌ Assertion failed: ${message}`);
  }
  console.log(`✅ ${message}`);
}

/**
 * Test pipeline with test mode enabled
 */
async function testPipelineTestMode() {
  console.log('\n🧪 Testing Pipeline (Test Mode)');
  console.log('===============================');
  
  const config = {
    testMode: true,
    hoursBack: 24,
    maxClustersPerRun: 2,
    enablePosting: false
  };
  
  const result = await main(config);
  
  assert(result.success === true, 'Pipeline succeeds in test mode');
  assert(result.itemsProcessed >= 0, `Items processed: ${result.itemsProcessed}`);
  assert(result.clustersFound >= 0, `Clusters found: ${result.clustersFound}`);
  assert(result.eventsCreated >= 0, `Events created: ${result.eventsCreated}`);
  assert(result.threadsPosted === 0, 'No threads posted in test mode');
  assert(result.duration > 0, `Duration: ${result.duration}ms`);
  
  console.log(`📊 Test Mode Results:`);
  console.log(`   Success: ${result.success}`);
  console.log(`   Duration: ${(result.duration / 1000).toFixed(2)}s`);
  console.log(`   Items processed: ${result.itemsProcessed}`);
  console.log(`   Clusters found: ${result.clustersFound}`);
  console.log(`   Events created: ${result.eventsCreated}`);
  console.log(`   Threads posted: ${result.threadsPosted}`);
  console.log(`   Errors: ${result.errors.length}`);
  
  console.log('✅ Pipeline test mode tests passed');
}

/**
 * Test pipeline with minimal configuration
 */
async function testPipelineMinimal() {
  console.log('\n🧪 Testing Pipeline (Minimal Config)');
  console.log('====================================');
  
  const config = {
    testMode: true,
    hoursBack: 12,
    maxClustersPerRun: 1,
    enablePosting: false
  };
  
  const result = await main(config);
  
  assert(result.success === true, 'Pipeline succeeds with minimal config');
  assert(result.duration > 0, 'Pipeline has execution time');
  
  console.log(`📊 Minimal Config Results:`);
  console.log(`   Success: ${result.success}`);
  console.log(`   Duration: ${(result.duration / 1000).toFixed(2)}s`);
  console.log(`   Items processed: ${result.itemsProcessed}`);
  console.log(`   Clusters found: ${result.clustersFound}`);
  
  console.log('✅ Pipeline minimal config tests passed');
}

/**
 * Test pipeline error handling
 */
async function testPipelineErrorHandling() {
  console.log('\n🧪 Testing Pipeline Error Handling');
  console.log('==================================');
  
  // Test with invalid configuration
  const config = {
    testMode: true,
    hoursBack: -1, // Invalid value
    maxClustersPerRun: 0, // Invalid value
    enablePosting: false
  };
  
  const result = await main(config);
  
  // Pipeline should still complete (graceful degradation)
  assert(result.duration > 0, 'Pipeline completes even with invalid config');
  
  console.log(`📊 Error Handling Results:`);
  console.log(`   Success: ${result.success}`);
  console.log(`   Duration: ${(result.duration / 1000).toFixed(2)}s`);
  console.log(`   Errors: ${result.errors.length}`);
  
  console.log('✅ Pipeline error handling tests passed');
}

/**
 * Test pipeline with different time windows
 */
async function testPipelineTimeWindows() {
  console.log('\n🧪 Testing Pipeline Time Windows');
  console.log('================================');
  
  const timeWindows = [6, 12, 24, 48];
  
  for (const hours of timeWindows) {
    console.log(`\n⏰ Testing ${hours} hour window...`);
    
    const config = {
      testMode: true,
      hoursBack: hours,
      maxClustersPerRun: 1,
      enablePosting: false
    };
    
    const result = await main(config);
    
    assert(result.success === true, `Pipeline succeeds with ${hours}h window`);
    assert(result.duration > 0, `Pipeline has execution time for ${hours}h window`);
    
    console.log(`   Duration: ${(result.duration / 1000).toFixed(2)}s`);
    console.log(`   Items processed: ${result.itemsProcessed}`);
    console.log(`   Clusters found: ${result.clustersFound}`);
  }
  
  console.log('✅ Pipeline time window tests passed');
}

/**
 * Test pipeline with different cluster limits
 */
async function testPipelineClusterLimits() {
  console.log('\n🧪 Testing Pipeline Cluster Limits');
  console.log('===================================');
  
  const clusterLimits = [1, 2, 3, 5];
  
  for (const limit of clusterLimits) {
    console.log(`\n📊 Testing ${limit} cluster limit...`);
    
    const config = {
      testMode: true,
      hoursBack: 24,
      maxClustersPerRun: limit,
      enablePosting: false
    };
    
    const result = await main(config);
    
    assert(result.success === true, `Pipeline succeeds with ${limit} cluster limit`);
    assert(result.duration > 0, `Pipeline has execution time for ${limit} cluster limit`);
    
    console.log(`   Duration: ${(result.duration / 1000).toFixed(2)}s`);
    console.log(`   Clusters found: ${result.clustersFound}`);
    console.log(`   Events created: ${result.eventsCreated}`);
  }
  
  console.log('✅ Pipeline cluster limit tests passed');
}

/**
 * Test pipeline idempotency
 */
async function testPipelineIdempotency() {
  console.log('\n🧪 Testing Pipeline Idempotency');
  console.log('===============================');
  
  const config = {
    testMode: true,
    hoursBack: 24,
    maxClustersPerRun: 2,
    enablePosting: false
  };
  
  // Run pipeline twice
  console.log('🔄 Running pipeline first time...');
  const result1 = await main(config);
  
  console.log('🔄 Running pipeline second time...');
  const result2 = await main(config);
  
  // Both runs should succeed
  assert(result1.success === true, 'First pipeline run succeeds');
  assert(result2.success === true, 'Second pipeline run succeeds');
  
  // Results should be consistent (idempotent)
  assert(result1.itemsProcessed === result2.itemsProcessed, 'Items processed are consistent');
  assert(result1.clustersFound === result2.clustersFound, 'Clusters found are consistent');
  
  console.log(`📊 Idempotency Results:`);
  console.log(`   First run duration: ${(result1.duration / 1000).toFixed(2)}s`);
  console.log(`   Second run duration: ${(result2.duration / 1000).toFixed(2)}s`);
  console.log(`   Items processed (both runs): ${result1.itemsProcessed}`);
  console.log(`   Clusters found (both runs): ${result1.clustersFound}`);
  
  console.log('✅ Pipeline idempotency tests passed');
}

/**
 * Test pipeline performance
 */
async function testPipelinePerformance() {
  console.log('\n🧪 Testing Pipeline Performance');
  console.log('===============================');
  
  const config = {
    testMode: true,
    hoursBack: 24,
    maxClustersPerRun: 3,
    enablePosting: false
  };
  
  const startTime = Date.now();
  const result = await main(config);
  const endTime = Date.now();
  
  const totalDuration = endTime - startTime;
  const pipelineDuration = result.duration;
  
  assert(result.success === true, 'Pipeline succeeds in performance test');
  assert(pipelineDuration > 0, 'Pipeline reports execution time');
  assert(totalDuration > 0, 'Total execution time is positive');
  
  // Performance should be reasonable (less than 5 minutes for test mode)
  const maxExpectedDuration = 5 * 60 * 1000; // 5 minutes
  assert(pipelineDuration < maxExpectedDuration, `Pipeline completes within ${maxExpectedDuration / 1000}s`);
  
  console.log(`📊 Performance Results:`);
  console.log(`   Total duration: ${(totalDuration / 1000).toFixed(2)}s`);
  console.log(`   Pipeline duration: ${(pipelineDuration / 1000).toFixed(2)}s`);
  console.log(`   Items processed: ${result.itemsProcessed}`);
  console.log(`   Clusters found: ${result.clustersFound}`);
  console.log(`   Events created: ${result.eventsCreated}`);
  
  console.log('✅ Pipeline performance tests passed');
}

/**
 * Test pipeline with different configurations
 */
async function testPipelineConfigurations() {
  console.log('\n🧪 Testing Pipeline Configurations');
  console.log('===================================');
  
  const configurations = [
    { testMode: true, hoursBack: 6, maxClustersPerRun: 1, enablePosting: false },
    { testMode: true, hoursBack: 12, maxClustersPerRun: 2, enablePosting: false },
    { testMode: true, hoursBack: 24, maxClustersPerRun: 3, enablePosting: false },
    { testMode: true, hoursBack: 48, maxClustersPerRun: 5, enablePosting: false }
  ];
  
  for (const config of configurations) {
    console.log(`\n⚙️ Testing config: ${config.hoursBack}h, ${config.maxClustersPerRun} clusters...`);
    
    const result = await main(config);
    
    assert(result.success === true, `Pipeline succeeds with config ${config.hoursBack}h/${config.maxClustersPerRun} clusters`);
    assert(result.duration > 0, `Pipeline has execution time for config ${config.hoursBack}h/${config.maxClustersPerRun} clusters`);
    
    console.log(`   Duration: ${(result.duration / 1000).toFixed(2)}s`);
    console.log(`   Items processed: ${result.itemsProcessed}`);
    console.log(`   Clusters found: ${result.clustersFound}`);
  }
  
  console.log('✅ Pipeline configuration tests passed');
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🧪 Running Pipeline Tests');
  console.log('==========================\n');
  
  try {
    await testPipelineTestMode();
    await testPipelineMinimal();
    await testPipelineErrorHandling();
    await testPipelineTimeWindows();
    await testPipelineClusterLimits();
    await testPipelineIdempotency();
    await testPipelinePerformance();
    await testPipelineConfigurations();
    
    console.log('\n🎉 All pipeline tests completed successfully!');
    console.log('✅ Pipeline system is working properly.');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}
