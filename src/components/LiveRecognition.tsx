import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, CameraOff, Play, Pause, Monitor, Users, Target, Zap, Download } from 'lucide-react';
import * as faceapi from 'face-api.js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RecognitionResult {
  id: string;
  name: string;
  confidence: number;
  box: { x: number; y: number; width: number; height: number };
  timestamp: Date;
}

interface FaceRegistration {
  id: string;
  name: string;
  face_encoding: string;
  created_at: string;
}

interface WebSocketMessage {
  type: 'face_recognition_request' | 'face_recognition_response';
  data: any;
}

interface Statistics {
  detectedFaces: number;
  recognitionAccuracy: number;
  frameRate: number;
  totalRecognitions: number;
}

const LiveRecognition = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const frameCountRef = useRef(0);
  const lastFrameTimeRef = useRef(Date.now());
  
  const [isRecognitionActive, setIsRecognitionActive] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [wsStatus, setWsStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [recognitionResults, setRecognitionResults] = useState<RecognitionResult[]>([]);
  const [registeredFaces, setRegisteredFaces] = useState<FaceRegistration[]>([]);
  const [recognitionHistory, setRecognitionHistory] = useState<RecognitionResult[]>([]);
  const [statistics, setStatistics] = useState<Statistics>({
    detectedFaces: 0,
    recognitionAccuracy: 0,
    frameRate: 0,
    totalRecognitions: 0
  });
  const [isModelsLoaded, setIsModelsLoaded] = useState(false);
  
  const { toast } = useToast();

  // Load face-api models
  const loadModels = useCallback(async () => {
    try {
      await Promise.all([
        faceapi.loadTinyFaceDetectorModel('/models'),
        faceapi.loadFaceLandmarkModel('/models'),
        faceapi.loadFaceRecognitionModel('/models')
      ]);
      setIsModelsLoaded(true);
      console.log('Face recognition models loaded successfully');
    } catch (error) {
      console.error('Error loading face-api models:', error);
      toast({
        title: "Model Loading Error",
        description: "Failed to load face recognition models. Please refresh the page.",
        variant: "destructive"
      });
    }
  }, [toast]);

  // Load registered faces from database
  const loadRegisteredFaces = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('face_registrations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRegisteredFaces(data || []);
    } catch (error) {
      console.error('Error loading registered faces:', error);
      toast({
        title: "Database Error",
        description: "Failed to load registered faces.",
        variant: "destructive"
      });
    }
  }, [toast]);

  // WebSocket connection
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setWsStatus('connecting');
    
    // For demo purposes, using a mock WebSocket URL
    // In production, replace with actual WebSocket server
    try {
      wsRef.current = new WebSocket('ws://localhost:8080/face-recognition');
      
      wsRef.current.onopen = () => {
        setWsStatus('connected');
        console.log('WebSocket connected');
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          if (message.type === 'face_recognition_response') {
            // Handle recognition response
            console.log('Recognition response:', message.data);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        setWsStatus('disconnected');
        console.log('WebSocket disconnected');
        // Auto-reconnect after 3 seconds
        setTimeout(connectWebSocket, 3000);
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setWsStatus('disconnected');
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      setWsStatus('disconnected');
    }
  }, []);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCameraActive(true);
        
        videoRef.current.onloadedmetadata = () => {
          if (canvasRef.current && videoRef.current) {
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
          }
        };
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Camera Error",
        description: "Failed to access camera. Please check permissions.",
        variant: "destructive"
      });
    }
  }, [toast]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setIsRecognitionActive(false);
  }, []);

  // Face recognition processing
  const processFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isModelsLoaded || !isRecognitionActive) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    try {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Detect faces
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptors();

      if (detections.length === 0) {
        setRecognitionResults([]);
        setStatistics(prev => ({ ...prev, detectedFaces: 0 }));
        return;
      }

      // Compare with registered faces
      const results: RecognitionResult[] = [];
      
      for (const detection of detections) {
        let bestMatch: { name: string; distance: number } | null = null;
        
        for (const registered of registeredFaces) {
          try {
            // In a real implementation, you would decode the face_encoding
            // For demo purposes, we'll use a mock comparison
            const mockDistance = Math.random() * 0.8; // Random distance for demo
            
            if (mockDistance < 0.6 && (!bestMatch || mockDistance < bestMatch.distance)) {
              bestMatch = { name: registered.name, distance: mockDistance };
            }
          } catch (error) {
            console.error('Error comparing face:', error);
          }
        }

        const result: RecognitionResult = {
          id: Math.random().toString(36).substr(2, 9),
          name: bestMatch ? bestMatch.name : 'Unknown Person',
          confidence: bestMatch ? (1 - bestMatch.distance) * 100 : 0,
          box: {
            x: detection.detection.box.x,
            y: detection.detection.box.y,
            width: detection.detection.box.width,
            height: detection.detection.box.height
          },
          timestamp: new Date()
        };

        results.push(result);

        // Draw bounding box
        ctx.strokeStyle = bestMatch ? '#10b981' : '#ef4444';
        ctx.lineWidth = 2;
        ctx.strokeRect(result.box.x, result.box.y, result.box.width, result.box.height);

        // Draw name and confidence
        ctx.fillStyle = bestMatch ? '#10b981' : '#ef4444';
        ctx.font = '14px Arial';
        const text = bestMatch ? 
          `${result.name} (${result.confidence.toFixed(1)}%)` : 
          'Unknown Person';
        ctx.fillText(text, result.box.x, result.box.y - 10);
      }

      setRecognitionResults(results);
      
      // Update statistics
      frameCountRef.current++;
      const now = Date.now();
      const timeDiff = now - lastFrameTimeRef.current;
      
      if (timeDiff >= 1000) {
        const fps = (frameCountRef.current * 1000) / timeDiff;
        const accuracy = results.length > 0 ? 
          (results.filter(r => r.name !== 'Unknown Person').length / results.length) * 100 : 0;
        
        setStatistics(prev => ({
          detectedFaces: results.length,
          recognitionAccuracy: accuracy,
          frameRate: fps,
          totalRecognitions: prev.totalRecognitions + results.filter(r => r.name !== 'Unknown Person').length
        }));
        
        frameCountRef.current = 0;
        lastFrameTimeRef.current = now;
      }

      // Add to history (keep last 100)
      setRecognitionHistory(prev => 
        [...results, ...prev].slice(0, 100)
      );

      // Send to WebSocket if connected
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        const message: WebSocketMessage = {
          type: 'face_recognition_request',
          data: { results, timestamp: new Date().toISOString() }
        };
        wsRef.current.send(JSON.stringify(message));
      }

    } catch (error) {
      console.error('Error processing frame:', error);
    }
  }, [isModelsLoaded, isRecognitionActive, registeredFaces]);

  // Start/stop recognition
  const toggleRecognition = useCallback(() => {
    if (isRecognitionActive) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsRecognitionActive(false);
    } else {
      if (!isCameraActive) {
        toast({
          title: "Camera Required",
          description: "Please start the camera first.",
          variant: "destructive"
        });
        return;
      }
      
      setIsRecognitionActive(true);
      intervalRef.current = setInterval(processFrame, 500); // 2 FPS
    }
  }, [isRecognitionActive, isCameraActive, processFrame, toast]);

  // Export recognition logs
  const exportLogs = useCallback(() => {
    const data = recognitionHistory.map(result => ({
      name: result.name,
      confidence: result.confidence,
      timestamp: result.timestamp.toISOString()
    }));
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recognition-logs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [recognitionHistory]);

  // Initialize on mount
  useEffect(() => {
    loadModels();
    loadRegisteredFaces();
    connectWebSocket();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [loadModels, loadRegisteredFaces, connectWebSocket]);

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-slate-900' : ''} bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700 shadow-2xl`}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Target className="w-6 h-6 text-purple-400" />
            <h2 className="text-2xl font-bold text-white">Live Recognition</h2>
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
              wsStatus === 'connected' ? 'bg-green-500/20 text-green-400' :
              wsStatus === 'connecting' ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-red-500/20 text-red-400'
            }`}>
              {wsStatus}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition-colors"
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              onClick={exportLogs}
              className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition-colors"
              disabled={recognitionHistory.length === 0}
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
          {/* Video Feed */}
          <div className="lg:col-span-2 space-y-4">
            <div className="relative bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-auto max-h-96 object-cover"
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full object-cover"
              />
              
              {!isCameraActive && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-800/80">
                  <div className="text-center">
                    <Camera className="w-16 h-16 mx-auto mb-4 text-slate-400" />
                    <p className="text-slate-300">Camera not active</p>
                  </div>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center space-x-4">
              <button
                onClick={isCameraActive ? stopCamera : startCamera}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  isCameraActive
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isCameraActive ? (
                  <>
                    <CameraOff className="w-5 h-5 mr-2 inline" />
                    Stop Camera
                  </>
                ) : (
                  <>
                    <Camera className="w-5 h-5 mr-2 inline" />
                    Start Camera
                  </>
                )}
              </button>

              <button
                onClick={toggleRecognition}
                disabled={!isCameraActive || !isModelsLoaded}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  isRecognitionActive
                    ? 'bg-orange-600 hover:bg-orange-700 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white disabled:bg-slate-600 disabled:text-slate-400'
                }`}
              >
                {isRecognitionActive ? (
                  <>
                    <Pause className="w-5 h-5 mr-2 inline" />
                    Stop Recognition
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2 inline" />
                    Start Recognition
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Statistics & Results */}
          <div className="space-y-6">
            {/* Statistics */}
            <div className="bg-slate-700/50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Zap className="w-5 h-5 mr-2 text-yellow-400" />
                Statistics
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-300">Detected Faces:</span>
                  <span className="text-white font-medium">{statistics.detectedFaces}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Accuracy:</span>
                  <span className="text-white font-medium">{statistics.recognitionAccuracy.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Frame Rate:</span>
                  <span className="text-white font-medium">{statistics.frameRate.toFixed(1)} FPS</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Total Recognitions:</span>
                  <span className="text-white font-medium">{statistics.totalRecognitions}</span>
                </div>
              </div>
            </div>

            {/* Current Results */}
            <div className="bg-slate-700/50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Users className="w-5 h-5 mr-2 text-blue-400" />
                Current Detection
              </h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {recognitionResults.length === 0 ? (
                  <p className="text-slate-400 text-sm">No faces detected</p>
                ) : (
                  recognitionResults.map((result) => (
                    <div
                      key={result.id}
                      className={`p-2 rounded text-sm ${
                        result.name === 'Unknown Person'
                          ? 'bg-red-500/20 text-red-300'
                          : 'bg-green-500/20 text-green-300'
                      }`}
                    >
                      <div className="font-medium">{result.name}</div>
                      {result.confidence > 0 && (
                        <div className="text-xs opacity-75">
                          {result.confidence.toFixed(1)}% confidence
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recognition History */}
            <div className="bg-slate-700/50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-4">Recent History</h3>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {recognitionHistory.slice(0, 10).map((result, index) => (
                  <div key={`${result.id}-${index}`} className="text-xs text-slate-300 flex justify-between">
                    <span>{result.name}</span>
                    <span>{result.timestamp.toLocaleTimeString()}</span>
                  </div>
                ))}
                {recognitionHistory.length === 0 && (
                  <p className="text-slate-400 text-sm">No recognition history</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveRecognition;
