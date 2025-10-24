import { storage } from "./storage";

const PRODUCTION_PORTAL_URL = "https://eservices.himachaltourism.gov.in/";

interface ScrapedStats {
  totalApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  pendingApplications: number;
}

export async function scrapeProductionStats(): Promise<ScrapedStats | null> {
  try {
    console.log(`[scraper] Fetching stats from ${PRODUCTION_PORTAL_URL}`);
    
    const response = await fetch(PRODUCTION_PORTAL_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      console.error(`[scraper] Failed to fetch: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const html = await response.text();
    
    const stats = extractStatsFromHTML(html);
    
    if (stats) {
      await storage.saveProductionStats({
        ...stats,
        sourceUrl: PRODUCTION_PORTAL_URL
      });
      
      console.log(`[scraper] Successfully scraped and saved stats:`, stats);
    }
    
    return stats;
  } catch (error) {
    console.error('[scraper] Error scraping production stats:', error);
    return null;
  }
}

function extractStatsFromHTML(html: string): ScrapedStats | null {
  try {
    const totalMatch = html.match(/Total Applications[\s\S]*?(\d+)/i);
    const approvedMatch = html.match(/Approved Applications[\s\S]*?(\d+)/i);
    const rejectedMatch = html.match(/Rejected Applications[\s\S]*?(\d+)/i);
    const pendingMatch = html.match(/Pending Applications[\s\S]*?(\d+)/i);
    
    if (totalMatch && approvedMatch && rejectedMatch && pendingMatch) {
      return {
        totalApplications: parseInt(totalMatch[1]),
        approvedApplications: parseInt(approvedMatch[1]),
        rejectedApplications: parseInt(rejectedMatch[1]),
        pendingApplications: parseInt(pendingMatch[1])
      };
    }
    
    return null;
  } catch (error) {
    console.error('[scraper] Error extracting stats from HTML:', error);
    return null;
  }
}

let scraperInterval: NodeJS.Timeout | null = null;

export function startScraperScheduler() {
  scrapeProductionStats();
  
  scraperInterval = setInterval(() => {
    scrapeProductionStats();
  }, 60 * 60 * 1000);
  
  console.log('[scraper] Scheduler started - will scrape every hour');
}

export function stopScraperScheduler() {
  if (scraperInterval) {
    clearInterval(scraperInterval);
    scraperInterval = null;
    console.log('[scraper] Scheduler stopped');
  }
}
