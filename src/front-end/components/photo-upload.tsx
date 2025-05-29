import { useState, useRef, useCallback } from "react";

type UploadState = {
  isUploading: boolean;
  progress: string;
  currentStep: string;
};

interface PhotoUploadProps {
  onUrlSubmit: (url: string) => void;
  uploadState?: UploadState;
}

export default function PhotoUpload({ onUrlSubmit, uploadState }: PhotoUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string>("");
  const [urlInput, setUrlInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const convertFileToDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    setIsProcessing(true);
    try {
      const dataURL = await convertFileToDataURL(file);
      onUrlSubmit(dataURL);
    } catch (error) {
      console.error('Error processing file:', error);
      alert('Error processing image');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const startCamera = async () => {
    console.log('Starting camera...');
    setCameraError("");
    
    // Check if getUserMedia is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const errorMsg = 'Camera not supported in this browser';
      setCameraError(errorMsg);
      alert(errorMsg);
      return;
    }

    try {
      console.log('Requesting camera permissions...');
      let stream;
      
      try {
        // Try back camera first
        console.log('Trying back camera...');
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: { exact: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          } 
        });
        console.log('Back camera acquired successfully');
      } catch (envError) {
        console.log('Back camera failed, trying any camera...', envError);
        try {
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              facingMode: 'environment',
              width: { ideal: 1920 },
              height: { ideal: 1080 }
            } 
          });
          console.log('Alternative camera acquired successfully');
        } catch (fallbackError) {
          console.log('Fallback failed, trying basic video...', fallbackError);
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: true
          });
          console.log('Basic camera acquired successfully');
        }
      }
      
      if (!stream) {
        throw new Error('Failed to acquire camera stream');
      }
      
      console.log('Stream acquired, storing stream reference...');
      streamRef.current = stream;
      setShowCamera(true);
      
      // Wait for the next render cycle before setting up video
      setTimeout(() => {
        if (videoRef.current && streamRef.current) {
          console.log('Setting video stream on video element...');
          videoRef.current.srcObject = streamRef.current;
          
          // Wait for video to be ready
          videoRef.current.onloadedmetadata = () => {
            console.log('Video metadata loaded, camera ready');
          };
          
          videoRef.current.onerror = (e) => {
            console.error('Video error:', e);
            setCameraError('Video playback error');
          };
        } else {
          console.error('Video ref or stream not available after showing camera UI');
          setCameraError('Video element or stream not found');
        }
      }, 100);
      
    } catch (error: any) {
      console.error('Camera error:', error);
      const errorMsg = `Camera access failed: ${error.message || 'Unknown error'}`;
      setCameraError(errorMsg);
      alert(errorMsg + '\n\nPlease check browser permissions and try again.');
    }
  };

  const capturePhoto = () => {
    console.log('Capturing photo...');
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (ctx && video.videoWidth > 0 && video.videoHeight > 0) {
        console.log(`Video dimensions: ${video.videoWidth}x${video.videoHeight}`);
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        
        const dataURL = canvas.toDataURL('image/jpeg', 0.8);
        console.log('Photo captured, submitting...');
        onUrlSubmit(dataURL);
        
        // Stop camera
        stopCamera();
      } else {
        console.error('Video not ready or canvas context not available');
        setCameraError('Video not ready for capture');
      }
    } else {
      console.error('Video or canvas element not available');
      setCameraError('Camera elements not ready');
    }
  };

  const stopCamera = () => {
    console.log('Stopping camera...');
    
    // Stop the stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        console.log('Stopping track:', track.kind);
        track.stop();
      });
      streamRef.current = null;
    }
    
    // Clear video element
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setShowCamera(false);
    setCameraError("");
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) {
      onUrlSubmit(urlInput.trim());
      setUrlInput("");
    }
  };

  if (showCamera) {
    return (
      <div className="bg-gradient-to-br from-purple-600/20 via-stone-800/50 to-blue-400/20 border-4 border-purple-600 p-8 transform -rotate-1 shadow-[8px_8px_0px_rgba(0,0,0,0.8)]">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-black uppercase text-purple-400 mb-2 tracking-wide">
            📷 Camera Capture
          </h2>
          <p className="text-stone-300 text-lg">Position your concert poster in the viewfinder</p>
          <p className="text-stone-400 text-sm mt-2">Using outward-facing camera for best poster capture</p>
        </div>
        
        <div className="flex flex-col items-center space-y-6">
          {/* Camera Viewfinder */}
          <div className="relative">
            {/* Decorative corner brackets */}
            <div className="absolute -top-4 -left-4 w-8 h-8 border-t-4 border-l-4 border-yellow-400 z-10"></div>
            <div className="absolute -top-4 -right-4 w-8 h-8 border-t-4 border-r-4 border-yellow-400 z-10"></div>
            <div className="absolute -bottom-4 -left-4 w-8 h-8 border-b-4 border-l-4 border-yellow-400 z-10"></div>
            <div className="absolute -bottom-4 -right-4 w-8 h-8 border-b-4 border-r-4 border-yellow-400 z-10"></div>
            
            {/* Video container with poster frame styling */}
            <div className="relative border-4 border-white shadow-[8px_8px_0px_rgba(0,0,0,0.8)] bg-black transform rotate-1">
              <video 
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="max-w-full w-full max-h-[400px] object-cover"
              />
              
              {/* Overlay guide for poster alignment */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-4 border-2 border-dashed border-yellow-400/50 flex items-center justify-center">
                  <span className="bg-black/70 text-yellow-400 px-3 py-1 text-sm font-bold rounded">
                    📋 Position poster here
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Instructions */}
          <div className="bg-black/40 border-l-4 border-purple-400 p-4 max-w-md">
            <p className="text-purple-300 text-sm">
              💡 <strong>Tips:</strong> Hold device steady, ensure good lighting, and fill the frame with your poster for best results.
            </p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-6">
            <button
              onClick={capturePhoto}
              className="bg-red-600 hover:bg-yellow-400 hover:text-black text-white font-black text-2xl uppercase tracking-wider px-12 py-4 transform -skew-x-3 shadow-[6px_6px_0px_rgba(0,0,0,0.8)] hover:shadow-[8px_8px_0px_rgba(0,0,0,0.8)] hover:-translate-y-2 transition-all duration-300 border-4 border-white"
            >
              📸 Capture Poster
            </button>
            <button
              onClick={stopCamera}
              className="bg-stone-600 hover:bg-stone-500 text-white font-black text-xl uppercase tracking-wider px-8 py-4 transform skew-x-3 shadow-[6px_6px_0px_rgba(0,0,0,0.8)] hover:shadow-[8px_8px_0px_rgba(0,0,0,0.8)] hover:-translate-y-2 transition-all duration-300 border-4 border-white"
            >
              ❌ Cancel
            </button>
          </div>
          
          <canvas ref={canvasRef} className="hidden" />
        </div>
      </div>
    );
  }

  // Show upload progress if uploading
  if (uploadState?.isUploading || uploadState?.currentStep) {
    return (
      <div className="bg-gradient-to-br from-blue-600/20 via-stone-800/50 to-green-400/20 border-4 border-blue-600 p-8 transform -rotate-1 shadow-[8px_8px_0px_rgba(0,0,0,0.8)]">
        <div className="text-center space-y-6">
          <h2 className="text-3xl font-black uppercase text-blue-400 mb-2 tracking-wide">
            🚀 Processing Your Poster
          </h2>
          
          {/* Progress Bar */}
          <div className="relative bg-black/60 border-2 border-stone-600 h-8 transform skew-x-2 overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-green-400 transition-all duration-1000 ease-out"
              style={{ width: uploadState?.progress || '0%' }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white font-bold text-sm uppercase tracking-wide z-10">
                {uploadState?.progress || '0%'}
              </span>
            </div>
          </div>
          
          {/* Current Step */}
          <div className="bg-black/40 border-l-4 border-blue-400 p-4">
            <p className="text-blue-300 text-lg font-bold animate-pulse">
              {uploadState?.isUploading ? '⚙️' : '✅'} {uploadState?.currentStep}
            </p>
          </div>
          
          {/* Loading Animation */}
          {uploadState?.isUploading && (
            <div className="flex justify-center space-x-2">
              <div className="w-4 h-4 bg-red-500 rounded-full animate-bounce"></div>
              <div className="w-4 h-4 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-4 h-4 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-red-600/20 via-stone-800/50 to-yellow-400/20 border-4 border-red-600 p-8 transform -rotate-1 shadow-[8px_8px_0px_rgba(0,0,0,0.8)]">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-black uppercase text-red-400 mb-2 tracking-wide">
          📸 Upload Your Poster
        </h2>
        <p className="text-stone-300 text-lg">Drag & drop, choose a file, take a photo, or paste a URL</p>
      </div>
      
      <div className="space-y-6">
        {/* Camera Error Display */}
        {cameraError && (
          <div className="bg-red-600/20 border-2 border-red-500 p-4 text-center">
            <p className="text-red-400 font-bold">
              ❌ Camera Error: {cameraError}
            </p>
            <p className="text-red-300 text-sm mt-2">
              Check browser permissions and try again
            </p>
          </div>
        )}

        {/* URL Input */}
        <form onSubmit={handleUrlSubmit} className="space-y-4">
          <div className="relative">
            <input 
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com/awesome-concert-poster.jpg"
              className="w-full p-4 text-lg bg-black/60 border-4 border-stone-600 focus:border-yellow-400 focus:outline-none text-white placeholder-stone-400 font-mono transform skew-x-1 transition-all duration-300"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
              <span className="text-2xl">🔗</span>
            </div>
          </div>
          
          <div className="text-center">
            <button 
              type="submit"
              disabled={!urlInput.trim()}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-stone-600 disabled:cursor-not-allowed text-white font-black text-xl uppercase tracking-wider px-8 py-3 transform -skew-x-2 shadow-[4px_4px_0px_rgba(0,0,0,0.8)] hover:shadow-[6px_6px_0px_rgba(0,0,0,0.8)] hover:-translate-y-1 transition-all duration-300 border-2 border-white"
            >
              🔗 Submit URL
            </button>
          </div>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-4">
          <div className="flex-1 h-1 bg-stone-600"></div>
          <span className="text-stone-400 font-bold uppercase tracking-wide">OR</span>
          <div className="flex-1 h-1 bg-stone-600"></div>
        </div>

        {/* File Upload Area */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-4 border-dashed p-8 text-center transition-all duration-300 transform hover:scale-[1.02] ${
            isDragging 
              ? 'border-yellow-400 bg-yellow-400/10 scale-105' 
              : 'border-stone-500 hover:border-red-500'
          } ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
        >
          {isProcessing ? (
            <div className="space-y-4">
              <div className="text-6xl animate-spin">⚙️</div>
              <p className="text-yellow-400 font-bold text-xl">Processing your poster...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-6xl">🎭</div>
              <p className="text-stone-300 text-xl font-bold">
                {isDragging ? 'Drop that poster here!' : 'Drag & drop your concert poster here'}
              </p>
              <p className="text-stone-400">or</p>
              
              <div className="flex flex-wrap justify-center gap-4">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-green-600 hover:bg-green-500 text-white font-black text-lg uppercase tracking-wide px-6 py-3 transform skew-x-2 shadow-[4px_4px_0px_rgba(0,0,0,0.7)] hover:shadow-[6px_6px_0px_rgba(0,0,0,0.7)] hover:-translate-y-1 transition-all duration-300 border-2 border-white"
                >
                  📁 Choose File
                </button>
                
                <button
                  onClick={startCamera}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-black text-lg uppercase tracking-wide px-6 py-3 transform -skew-x-2 shadow-[4px_4px_0px_rgba(0,0,0,0.7)] hover:shadow-[6px_6px_0px_rgba(0,0,0,0.7)] hover:-translate-y-1 transition-all duration-300 border-2 border-white"
                >
                  📷 Take Photo
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </div>
  );
}