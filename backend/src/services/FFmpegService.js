const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

/**
 * FFmpeg Service for WebRTC Meeting Recording and Streaming
 * 
 * Provides comprehensive video/audio processing capabilities:
 * - Real-time meeting recording
 * - Stream mixing and composition
 * - Format conversion and optimization
 * - Audio/video quality enhancement
 * - RTMP streaming for broadcasting
 * - Thumbnail generation
 * - Video transcription preparation
 */
class FFmpegService {
  constructor() {
    this.activeRecordings = new Map();
    this.activeStreams = new Map();
    this.recordingsPath = process.env.RECORDINGS_PATH || '/var/www/html/recordings';
    this.streamsPath = process.env.STREAMS_PATH || '/var/www/html/streams';
    
    // Recording settings
    this.RECORDING_SETTINGS = {
      video: {
        codec: 'libx264',
        bitrate: '2000k',
        fps: 30,
        resolution: '1920x1080',
        preset: 'medium',
        crf: 23
      },
      audio: {
        codec: 'aac',
        bitrate: '128k',
        sampleRate: 44100,
        channels: 2
      },
      format: 'mp4'
    };

    // Streaming settings
    this.STREAMING_SETTINGS = {
      rtmp: {
        video: {
          codec: 'libx264',
          bitrate: '1500k',
          fps: 30,
          resolution: '1280x720',
          preset: 'ultrafast',
          tune: 'zerolatency'
        },
        audio: {
          codec: 'aac',
          bitrate: '96k',
          sampleRate: 44100
        }
      },
      hls: {
        segmentDuration: 6,
        playlistSize: 10,
        deleteOldSegments: true
      }
    };

    this.ensureDirectories();
  }

  async ensureDirectories() {
    try {
      await fs.mkdir(this.recordingsPath, { recursive: true });
      await fs.mkdir(this.streamsPath, { recursive: true });
      await fs.mkdir(path.join(this.streamsPath, 'hls'), { recursive: true });
      console.log('📁 FFmpeg directories ensured');
    } catch (error) {
      console.error('Error creating FFmpeg directories:', error);
    }
  }

  /**
   * Start recording a WebRTC meeting
   */
  async startRecording(roomId, options = {}) {
    try {
      if (this.activeRecordings.has(roomId)) {
        return {
          success: false,
          error: 'Recording already in progress for this room'
        };
      }

      const recordingId = `recording_${roomId}_${Date.now()}`;
      const filename = `${recordingId}.${this.RECORDING_SETTINGS.format}`;
      const outputPath = path.join(this.recordingsPath, filename);

      // Merge user settings with defaults
      const settings = {
        ...this.RECORDING_SETTINGS,
        ...options.settings
      };

      // FFmpeg command for recording mixed audio/video stream
      // This would typically receive input from a virtual display/audio device
      // or RTMP input from WebRTC bridge
      const ffmpegArgs = [
        '-f', 'pulse', // Audio input (Linux)
        '-i', 'default',
        '-f', 'x11grab', // Screen capture for video (Linux)
        '-s', settings.video.resolution,
        '-r', settings.video.fps.toString(),
        '-i', ':99', // Virtual display
        
        // Video encoding
        '-c:v', settings.video.codec,
        '-b:v', settings.video.bitrate,
        '-preset', settings.video.preset,
        '-crf', settings.video.crf.toString(),
        
        // Audio encoding
        '-c:a', settings.audio.codec,
        '-b:a', settings.audio.bitrate,
        '-ar', settings.audio.sampleRate.toString(),
        '-ac', settings.audio.channels.toString(),
        
        // Output format and path
        '-f', settings.format,
        outputPath
      ];

      // For demo purposes, create a simple recording command
      // In production, you'd set up a virtual framebuffer and audio sink
      const demoArgs = [
        '-f', 'lavfi',
        '-i', 'testsrc=duration=30:size=1920x1080:rate=30',
        '-f', 'lavfi',
        '-i', 'sine=frequency=440:duration=30',
        '-c:v', 'libx264',
        '-preset', 'medium',
        '-c:a', 'aac',
        '-shortest',
        outputPath
      ];

      const ffmpeg = spawn('ffmpeg', demoArgs, {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      const recording = {
        id: recordingId,
        roomId: roomId,
        filename: filename,
        outputPath: outputPath,
        process: ffmpeg,
        startTime: new Date(),
        settings: settings,
        status: 'recording'
      };

      this.activeRecordings.set(roomId, recording);

      // Handle process events
      ffmpeg.stdout.on('data', (data) => {
        console.log(`FFmpeg stdout: ${data}`);
      });

      ffmpeg.stderr.on('data', (data) => {
        console.log(`FFmpeg stderr: ${data}`);
      });

      ffmpeg.on('close', (code) => {
        console.log(`FFmpeg recording process exited with code ${code}`);
        if (this.activeRecordings.has(roomId)) {
          const rec = this.activeRecordings.get(roomId);
          rec.status = code === 0 ? 'completed' : 'failed';
          rec.endTime = new Date();
          rec.duration = rec.endTime - rec.startTime;
        }
      });

      console.log(`📹 Started recording for room ${roomId}: ${recordingId}`);

      return {
        success: true,
        recordingId: recordingId,
        outputPath: outputPath
      };

    } catch (error) {
      console.error('Error starting recording:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Stop recording a WebRTC meeting
   */
  async stopRecording(roomId) {
    try {
      if (!this.activeRecordings.has(roomId)) {
        return {
          success: false,
          error: 'No active recording found for this room'
        };
      }

      const recording = this.activeRecordings.get(roomId);
      
      // Send SIGTERM to gracefully stop FFmpeg
      recording.process.kill('SIGTERM');
      
      // Wait for process to end
      await new Promise((resolve) => {
        recording.process.on('close', resolve);
      });

      recording.endTime = new Date();
      recording.duration = recording.endTime - recording.startTime;
      recording.status = 'completed';

      // Generate thumbnail
      await this.generateThumbnail(recording.outputPath);

      // Move to completed recordings
      this.activeRecordings.delete(roomId);

      console.log(`📹 Stopped recording for room ${roomId}: ${recording.id}`);

      return {
        success: true,
        recordingId: recording.id,
        filePath: recording.outputPath,
        duration: Math.floor(recording.duration / 1000), // seconds
        fileSize: await this.getFileSize(recording.outputPath)
      };

    } catch (error) {
      console.error('Error stopping recording:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Start RTMP streaming for a meeting room
   */
  async startStreaming(roomId, streamUrl, options = {}) {
    try {
      if (this.activeStreams.has(roomId)) {
        return {
          success: false,
          error: 'Streaming already active for this room'
        };
      }

      const streamId = `stream_${roomId}_${Date.now()}`;
      const settings = {
        ...this.STREAMING_SETTINGS.rtmp,
        ...options.settings
      };

      // FFmpeg command for RTMP streaming
      const ffmpegArgs = [
        // Input (same as recording)
        '-f', 'lavfi',
        '-i', 'testsrc=duration=3600:size=1280x720:rate=30',
        '-f', 'lavfi',
        '-i', 'sine=frequency=440:duration=3600',
        
        // Video encoding for streaming
        '-c:v', settings.video.codec,
        '-b:v', settings.video.bitrate,
        '-preset', settings.video.preset,
        '-tune', settings.video.tune,
        '-s', settings.video.resolution,
        '-r', settings.video.fps.toString(),
        
        // Audio encoding for streaming
        '-c:a', settings.audio.codec,
        '-b:a', settings.audio.bitrate,
        '-ar', settings.audio.sampleRate.toString(),
        
        // RTMP output
        '-f', 'flv',
        streamUrl
      ];

      const ffmpeg = spawn('ffmpeg', ffmpegArgs, {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      const stream = {
        id: streamId,
        roomId: roomId,
        streamUrl: streamUrl,
        process: ffmpeg,
        startTime: new Date(),
        settings: settings,
        status: 'streaming'
      };

      this.activeStreams.set(roomId, stream);

      // Handle process events
      ffmpeg.stderr.on('data', (data) => {
        console.log(`FFmpeg stream stderr: ${data}`);
      });

      ffmpeg.on('close', (code) => {
        console.log(`FFmpeg streaming process exited with code ${code}`);
        if (this.activeStreams.has(roomId)) {
          this.activeStreams.delete(roomId);
        }
      });

      console.log(`📡 Started streaming for room ${roomId} to ${streamUrl}`);

      return {
        success: true,
        streamId: streamId,
        streamUrl: streamUrl
      };

    } catch (error) {
      console.error('Error starting stream:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Stop RTMP streaming
   */
  async stopStreaming(roomId) {
    try {
      if (!this.activeStreams.has(roomId)) {
        return {
          success: false,
          error: 'No active stream found for this room'
        };
      }

      const stream = this.activeStreams.get(roomId);
      stream.process.kill('SIGTERM');
      
      this.activeStreams.delete(roomId);

      console.log(`📡 Stopped streaming for room ${roomId}`);

      return {
        success: true,
        streamId: stream.id
      };

    } catch (error) {
      console.error('Error stopping stream:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate HLS stream for web playback
   */
  async startHLSStream(roomId, options = {}) {
    try {
      const streamId = `hls_${roomId}_${Date.now()}`;
      const playlistPath = path.join(this.streamsPath, 'hls', `${streamId}.m3u8`);
      const segmentPattern = path.join(this.streamsPath, 'hls', `${streamId}_%03d.ts`);

      const settings = {
        ...this.STREAMING_SETTINGS.hls,
        ...options.settings
      };

      const ffmpegArgs = [
        // Input
        '-f', 'lavfi',
        '-i', 'testsrc=duration=3600:size=1280x720:rate=30',
        '-f', 'lavfi',
        '-i', 'sine=frequency=440:duration=3600',
        
        // Video encoding
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-tune', 'zerolatency',
        '-s', '1280x720',
        '-b:v', '1000k',
        
        // Audio encoding
        '-c:a', 'aac',
        '-b:a', '96k',
        
        // HLS options
        '-f', 'hls',
        '-hls_time', settings.segmentDuration.toString(),
        '-hls_list_size', settings.playlistSize.toString(),
        '-hls_flags', settings.deleteOldSegments ? 'delete_segments' : '',
        '-hls_segment_filename', segmentPattern,
        
        playlistPath
      ];

      const ffmpeg = spawn('ffmpeg', ffmpegArgs, {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      const stream = {
        id: streamId,
        roomId: roomId,
        playlistPath: playlistPath,
        process: ffmpeg,
        startTime: new Date(),
        type: 'hls',
        status: 'streaming'
      };

      this.activeStreams.set(`hls_${roomId}`, stream);

      console.log(`📺 Started HLS stream for room ${roomId}: ${playlistPath}`);

      return {
        success: true,
        streamId: streamId,
        playlistUrl: `/streams/hls/${streamId}.m3u8`
      };

    } catch (error) {
      console.error('Error starting HLS stream:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Convert recorded video to different formats
   */
  async convertVideo(inputPath, outputPath, format = 'mp4', options = {}) {
    try {
      const ffmpegArgs = [
        '-i', inputPath,
        '-c:v', options.videoCodec || 'libx264',
        '-c:a', options.audioCodec || 'aac',
        '-preset', options.preset || 'medium',
        outputPath
      ];

      return new Promise((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', ffmpegArgs);
        
        ffmpeg.on('close', (code) => {
          if (code === 0) {
            resolve({
              success: true,
              outputPath: outputPath
            });
          } else {
            reject(new Error(`FFmpeg exited with code ${code}`));
          }
        });
        
        ffmpeg.on('error', reject);
      });

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate thumbnail for recorded video
   */
  async generateThumbnail(videoPath) {
    try {
      const thumbnailPath = videoPath.replace(/\.[^/.]+$/, '_thumb.jpg');
      
      const ffmpegArgs = [
        '-i', videoPath,
        '-ss', '00:00:05', // 5 seconds into video
        '-vframes', '1',
        '-s', '320x240',
        '-q:v', '2',
        thumbnailPath
      ];

      return new Promise((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', ffmpegArgs);
        
        ffmpeg.on('close', (code) => {
          if (code === 0) {
            resolve({
              success: true,
              thumbnailPath: thumbnailPath
            });
          } else {
            reject(new Error(`Thumbnail generation failed with code ${code}`));
          }
        });
        
        ffmpeg.on('error', reject);
      });

    } catch (error) {
      console.error('Error generating thumbnail:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Extract audio from video for transcription
   */
  async extractAudio(videoPath) {
    try {
      const audioPath = videoPath.replace(/\.[^/.]+$/, '_audio.wav');
      
      const ffmpegArgs = [
        '-i', videoPath,
        '-vn', // No video
        '-acodec', 'pcm_s16le',
        '-ar', '16000', // 16kHz for speech recognition
        '-ac', '1', // Mono
        audioPath
      ];

      return new Promise((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', ffmpegArgs);
        
        ffmpeg.on('close', (code) => {
          if (code === 0) {
            resolve({
              success: true,
              audioPath: audioPath
            });
          } else {
            reject(new Error(`Audio extraction failed with code ${code}`));
          }
        });
        
        ffmpeg.on('error', reject);
      });

    } catch (error) {
      console.error('Error extracting audio:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get file size
   */
  async getFileSize(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get active recordings
   */
  getActiveRecordings() {
    return Array.from(this.activeRecordings.values()).map(rec => ({
      id: rec.id,
      roomId: rec.roomId,
      status: rec.status,
      startTime: rec.startTime,
      duration: rec.endTime ? rec.endTime - rec.startTime : Date.now() - rec.startTime
    }));
  }

  /**
   * Get active streams
   */
  getActiveStreams() {
    return Array.from(this.activeStreams.values()).map(stream => ({
      id: stream.id,
      roomId: stream.roomId,
      type: stream.type || 'rtmp',
      status: stream.status,
      startTime: stream.startTime
    }));
  }

  /**
   * Cleanup old recordings
   */
  async cleanupOldRecordings(maxAgeHours = 24 * 7) { // 7 days default
    try {
      const files = await fs.readdir(this.recordingsPath);
      const now = Date.now();
      const maxAge = maxAgeHours * 60 * 60 * 1000;

      for (const file of files) {
        const filePath = path.join(this.recordingsPath, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath);
          console.log(`🗑️ Cleaned up old recording: ${file}`);
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error cleaning up recordings:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new FFmpegService();