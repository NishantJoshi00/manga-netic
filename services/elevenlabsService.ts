import { Conversation } from '@elevenlabs/client';

export type ConversationStatus = 'connected' | 'connecting' | 'disconnected';
export type ConversationMode = 'speaking' | 'listening';

export interface ElevenLabsOptions {
  agentId?: string;
  signedUrl?: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onMessage?: (message: any) => void;
  onError?: (error: Error) => void;
  onStatusChange?: (status: ConversationStatus) => void;
  onModeChange?: (mode: ConversationMode) => void;
}

export class ElevenLabsService {
  private conversation: Conversation | null = null;
  private currentStatus: ConversationStatus = 'disconnected';
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY || '';
  }

  async requestMicrophonePermission(): Promise<boolean> {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      return false;
    }
  }

  async startSession(options: ElevenLabsOptions): Promise<boolean> {
    try {
      if (this.conversation) {
        await this.endSession();
      }

      const hasPermission = await this.requestMicrophonePermission();
      if (!hasPermission) {
        throw new Error('Microphone permission is required for voice conversation');
      }

      const sessionOptions: any = {
        onConnect: () => {
          this.currentStatus = 'connected';
          options.onConnect?.();
        },
        onDisconnect: () => {
          this.currentStatus = 'disconnected';
          options.onDisconnect?.();
        },
        onMessage: options.onMessage,
        onError: options.onError,
        onStatusChange: (status: ConversationStatus) => {
          this.currentStatus = status;
          options.onStatusChange?.(status);
        },
        onModeChange: options.onModeChange,
      };

      if (options.agentId) {
        sessionOptions.agentId = options.agentId;
      } else if (options.signedUrl) {
        sessionOptions.signedUrl = options.signedUrl;
      } else {
        throw new Error('Either agentId or signedUrl must be provided');
      }

      this.currentStatus = 'connecting';
      this.conversation = await Conversation.startSession(sessionOptions);
      
      return true;
    } catch (error) {
      this.currentStatus = 'disconnected';
      console.error('Failed to start ElevenLabs session:', error);
      throw error;
    }
  }

  async endSession(): Promise<void> {
    if (this.conversation) {
      try {
        await this.conversation.endSession();
      } catch (error) {
        console.error('Error ending ElevenLabs session:', error);
      } finally {
        this.conversation = null;
        this.currentStatus = 'disconnected';
      }
    }
  }

  async setVolume(volume: number): Promise<void> {
    if (this.conversation && this.currentStatus === 'connected') {
      await this.conversation.setVolume({ volume: Math.max(0, Math.min(1, volume)) });
    }
  }

  async getInputVolume(): Promise<number> {
    if (this.conversation && this.currentStatus === 'connected') {
      return await this.conversation.getInputVolume();
    }
    return 0;
  }

  async getOutputVolume(): Promise<number> {
    if (this.conversation && this.currentStatus === 'connected') {
      return await this.conversation.getOutputVolume();
    }
    return 0;
  }

  getConversationId(): string | null {
    return this.conversation?.getId() || null;
  }

  getStatus(): ConversationStatus {
    return this.currentStatus;
  }

  isConnected(): boolean {
    return this.currentStatus === 'connected';
  }

  async getSignedUrl(): Promise<string> {
    const response = await fetch('/api/elevenlabs/signed-url');
    if (!response.ok) {
      throw new Error('Failed to get signed URL');
    }
    return await response.text();
  }

  async generateTTS(
    text: string,
    voiceId: string = 'Mv8AjrYZCBkdsmDHNwcB'
  ): Promise<string> {
    console.log('[TTS] Starting text-to-speech generation...');
    console.log(`[TTS] Text length: ${text.length} characters`);
    console.log(`[TTS] Voice ID: ${voiceId}`);

    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey,
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`);
      }

      console.log('[TTS] Audio generated successfully');
      console.log('[TTS] Response type:', response.headers.get('content-type'));
      
      const audioBlob = await response.blob();
      console.log(`[TTS] Created blob, size: ${Math.round(audioBlob.size / 1024)}KB`);
      console.log(`[TTS] Blob type: ${audioBlob.type}`);
      
      const audioUrl = URL.createObjectURL(audioBlob);
      console.log(`[TTS] Audio blob URL created: ${audioUrl}`);
      
      // Test the blob by creating a temporary audio element
      try {
        const testAudio = new Audio();
        testAudio.src = audioUrl;
        console.log(`[TTS] Test audio element created successfully`);
        
        testAudio.addEventListener('loadedmetadata', () => {
          console.log(`[TTS] Audio metadata loaded, duration: ${testAudio.duration}s`);
        });
        
        testAudio.addEventListener('error', (e) => {
          console.error(`[TTS] Audio error:`, e);
        });
        
      } catch (testError) {
        console.error('[TTS] Error testing audio:', testError);
      }
      
      return audioUrl;
    } catch (error) {
      console.error('[TTS] Error generating audio:', error);
      throw new Error(`Failed to generate audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

}

export const elevenLabsService = new ElevenLabsService();