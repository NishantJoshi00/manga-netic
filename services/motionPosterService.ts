import * as fal from "@fal-ai/serverless-client";

// Configure fal client
// NOTE: In production, this should be moved to a server-side API endpoint
// to avoid exposing credentials in the browser
if (!process.env.FAL_API_KEY) {
  console.warn('[MOTION_POSTER] FAL_API_KEY not found. Motion poster functionality will be disabled.');
} else {
  fal.config({
    credentials: process.env.FAL_API_KEY
  });
}

export interface MotionPosterResult {
  video_url: string;
  seed: number;
}

export class MotionPosterService {
  private cache = new Map<string, MotionPosterResult>();

  async generateMotionPoster(imageUrl: string): Promise<MotionPosterResult> {
    // Check cache first
    if (this.cache.has(imageUrl)) {
      return this.cache.get(imageUrl)!;
    }

    if (!process.env.FAL_API_KEY) {
      console.warn('[MOTION_POSTER] FAL_API_KEY not configured, skipping motion poster generation');
      throw new Error('FAL API key not configured');
    }

    try {
      const result = await fal.subscribe("fal-ai/minimax-video/image-to-video", {
        input: {
          prompt: "Extremely subtle and minimal motion. Only tiny movements like: characters blinking slowly, very slight head movement, gentle hair swaying, or clothes moving slightly in a breeze. Keep all major elements completely static. No camera movement. Maintain the exact same manga art style and composition.",
          image_url: imageUrl
        },
        logs: false,
        onQueueUpdate: (update) => {
          if (update.status === "IN_PROGRESS") {
            console.log(`Motion poster generation progress: ${update.logs?.join('\n') || 'Processing...'}`);
          }
        }
      });

      console.log('[MOTION_POSTER] FAL API Response:', JSON.stringify(result, null, 2));
      
      const motionResult: MotionPosterResult = {
        video_url: result.video?.url || result.data?.video?.url || result.url,
        seed: result.seed || Math.floor(Math.random() * 1000000)
      };
      
      if (!motionResult.video_url) {
        console.error('[MOTION_POSTER] No video URL found in response:', result);
        throw new Error('No video URL in FAL API response');
      }

      // Cache the result
      this.cache.set(imageUrl, motionResult);
      return motionResult;

    } catch (error) {
      console.error('Error generating motion poster:', error);
      throw new Error('Failed to generate motion poster');
    }
  }

  // Preload motion poster for seamless experience
  async preloadMotionPoster(imageUrl: string): Promise<void> {
    if (this.cache.has(imageUrl)) {
      return; // Already cached
    }

    try {
      // Generate motion poster in background
      await this.generateMotionPoster(imageUrl);
    } catch (error) {
      console.warn('Failed to preload motion poster for:', imageUrl, error);
    }
  }

  // Get cached motion poster if available
  getCachedMotionPoster(imageUrl: string): MotionPosterResult | null {
    return this.cache.get(imageUrl) || null;
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
  }
}

export const motionPosterService = new MotionPosterService();