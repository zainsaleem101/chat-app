import React, { useRef, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

export default function VideoCall({ localStream, remoteStream, handleEndCall, enableLocalVideo, socket, toggleRemoteVideo }) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const recognitionRef = useRef(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isRemoteVideoEnabled, setIsRemoteVideoEnabled] = useState(true);
  const [localCaptions, setLocalCaptions] = useState('');
  const [remoteCaptions, setRemoteCaptions] = useState('');
  const [speechError, setSpeechError] = useState('');
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);
  const [isRecognitionActive, setIsRecognitionActive] = useState(false);
  const { roomId } = useParams();
  const restartTimeoutRef = useRef(null);
  const recognitionStateRef = useRef('stopped'); // 'stopped', 'starting', 'running'

  // Clear caption after 5 seconds of no speech
  useEffect(() => {
    if (localCaptions) {
      const timer = setTimeout(() => {
        setLocalCaptions('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [localCaptions]);

  useEffect(() => {
    if (remoteCaptions) {
      const timer = setTimeout(() => {
        setRemoteCaptions('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [remoteCaptions]);

  // Initialize Web Speech API
  useEffect(() => {
    // Check browser support
    if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
      setIsSpeechSupported(false);
      setSpeechError('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    const startRecognition = () => {
      // Prevent multiple instances
      if (recognitionStateRef.current !== 'stopped') {
        return;
      }

      if (!localStream || !isVideoEnabled || !isSpeechSupported) {
        return;
      }

      const audioTracks = localStream.getAudioTracks();
      if (!audioTracks.length || !audioTracks[0].enabled) {
        setSpeechError('No active microphone detected. Please enable your microphone.');
        return;
      }

      try {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        
        // Configure recognition
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';
        recognitionRef.current.maxAlternatives = 1;

        recognitionRef.current.onstart = () => {
          console.log('Speech recognition started');
          recognitionStateRef.current = 'running';
          setIsRecognitionActive(true);
          setSpeechError('');
        };

        recognitionRef.current.onresult = (event) => {
          let finalTranscript = '';
          let interimTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }

          // Show both final and interim results
          const displayTranscript = finalTranscript || interimTranscript;
          if (displayTranscript.trim()) {
            setLocalCaptions(displayTranscript);
            socket.emit('captions', { roomId, transcript: displayTranscript, user: 'local' });
          }
        };

        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          recognitionStateRef.current = 'stopped';
          setIsRecognitionActive(false);

          switch (event.error) {
            case 'not-allowed':
              setSpeechError('Microphone access denied. Please allow microphone access.');
              break;
            case 'network':
              setSpeechError('Network error. Check your internet connection.');
              break;
            case 'audio-capture':
              setSpeechError('No microphone found or audio capture failed.');
              break;
            case 'no-speech':
              // Don't show error for no speech, just restart
              setSpeechError('');
              scheduleRestart();
              break;
            case 'aborted':
              // Don't show error for aborted, just restart
              setSpeechError('');
              scheduleRestart();
              break;
            default:
              setSpeechError(`Speech recognition error: ${event.error}`);
          }
        };

        recognitionRef.current.onend = () => {
          console.log('Speech recognition ended');
          recognitionStateRef.current = 'stopped';
          setIsRecognitionActive(false);
          
          // Only restart if we should still be listening
          if (localStream && isVideoEnabled && isSpeechSupported) {
            scheduleRestart();
          }
        };

        recognitionStateRef.current = 'starting';
        recognitionRef.current.start();

      } catch (error) {
        console.error('Failed to start speech recognition:', error);
        recognitionStateRef.current = 'stopped';
        setIsRecognitionActive(false);
        setSpeechError('Failed to start speech recognition. Please check microphone permissions.');
      }
    };

    const scheduleRestart = () => {
      // Clear any existing restart timeout
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }

      // Only schedule restart if we should still be listening
      if (localStream && isVideoEnabled && isSpeechSupported && recognitionStateRef.current === 'stopped') {
        restartTimeoutRef.current = setTimeout(() => {
          startRecognition();
        }, 1000);
      }
    };

    const stopRecognition = () => {
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = null;
      }

      if (recognitionRef.current && recognitionStateRef.current !== 'stopped') {
        recognitionStateRef.current = 'stopped';
        recognitionRef.current.stop();
      }
      setIsRecognitionActive(false);
    };

    // Start recognition when conditions are met
    if (localStream && isVideoEnabled && isSpeechSupported) {
      // Small delay to ensure everything is initialized
      const initTimer = setTimeout(() => {
        startRecognition();
      }, 1000);

      return () => {
        clearTimeout(initTimer);
        stopRecognition();
      };
    } else {
      stopRecognition();
    }

    return () => {
      stopRecognition();
    };
  }, [localStream, isVideoEnabled, isSpeechSupported, roomId, socket]);

  // Handle incoming captions
  useEffect(() => {
    const handleCaptions = ({ transcript, user }) => {
      if (user === 'remote') {
        setRemoteCaptions(transcript);
      }
    };

    socket.on('captions', handleCaptions);

    return () => {
      socket.off('captions', handleCaptions);
    };
  }, [socket]);

  // Handle remote video enable/disable
  useEffect(() => {
    const handleDisableRemoteVideo = ({ userId, username }) => {
      console.log('Disable remote video triggered by:', username);
      setIsRemoteVideoEnabled(false);
      toggleRemoteVideo(false);
    };

    const handleEnableRemoteVideo = ({ userId, username }) => {
      console.log('Enable remote video triggered by:', username);
      setIsRemoteVideoEnabled(true);
      toggleRemoteVideo(true);
    };

    socket.on('disable-remote-video', handleDisableRemoteVideo);
    socket.on('enable-remote-video', handleEnableRemoteVideo);

    return () => {
      socket.off('disable-remote-video', handleDisableRemoteVideo);
      socket.off('enable-remote-video', handleEnableRemoteVideo);
    };
  }, [socket, toggleRemoteVideo]);

  // Set local video stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Set remote video stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    } else if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
  }, [remoteStream]);

  // Update video enabled state
  useEffect(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      setIsVideoEnabled(videoTrack && videoTrack.readyState === 'live');
    } else {
      setIsVideoEnabled(false);
    }
  }, [localStream]);

  const toggleVideo = async () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        if (isVideoEnabled) {
          socket.emit('remote-video-disabled', { roomId });
          videoTrack.stop();
          setIsVideoEnabled(false);
        } else {
          socket.emit('remote-video-enabled', { roomId });
          await enableLocalVideo();
          setIsVideoEnabled(true);
        }
      }
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-gray-900 flex flex-col">
      {/* Main video container */}
      <div className="flex-1 relative overflow-hidden">
        {/* Remote video - main view */}
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          {!remoteStream ? 
            (!isRemoteVideoEnabled ? (
              <div className="flex flex-col items-center justify-center text-gray-400">
                <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </div>
                <p className="text-lg font-medium">Remote Video Disabled</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-gray-400">
                <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </div>
                <p className="text-lg font-medium">Waiting for remote user...</p>
              </div>
            )) : (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            )}
          
          {/* Remote user label */}
          {remoteStream && (
            <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm font-medium z-50">
              Remote User
            </div>
          )}

          {/* Speech recognition status indicator */}
          {isSpeechSupported && (
            <div className="absolute top-4 right-4 left-4 flex justify-between items-center z-50">
              <div></div>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
                isRecognitionActive 
                  ? 'bg-green-600 bg-opacity-80 text-white' 
                  : 'bg-gray-600 bg-opacity-80 text-gray-300'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  isRecognitionActive ? 'bg-green-300 animate-pulse' : 'bg-gray-400'
                }`}></div>
                {isRecognitionActive ? 'Listening...' : 'Not listening'}
              </div>
            </div>
          )}

          {/* Captions container */}
          <div className="absolute bottom-4 left-4 right-4 flex flex-col gap-2 z-50">
            {speechError && (
              <div className="bg-red-600 bg-opacity-90 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium max-w-2xl">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  {speechError}
                </div>
              </div>
            )}
            {localCaptions && (
              <div className="bg-blue-600 bg-opacity-90 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium max-w-2xl">
                <span className="font-semibold">You: </span>{localCaptions}
              </div>
            )}
            {remoteCaptions && (
              <div className="bg-green-600 bg-opacity-90 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium max-w-2xl">
                <span className="font-semibold">Remote User: </span>{remoteCaptions}
              </div>
            )}
          </div>
        </div>

        {/* Local video - picture-in-picture */}
        <div className="absolute top-4 right-4 w-48 h-36 sm:w-64 sm:h-48 md:w-80 md:h-60 bg-gray-800 rounded-lg overflow-hidden shadow-2xl border-2 border-gray-600 z-40">
          {localStream ? (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-700">
              <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>
            </div>
          )}
          
          {/* Local user label */}
          <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs font-medium z-50">
            You
          </div>
        </div>
      </div>

      {/* Control bar */}
      <div className="bg-gray-800 bg-opacity-95 backdrop-blur-sm p-4 flex justify-center items-center z-50">
        <div className="flex items-center gap-6">
          {/* Video toggle button */}
          <button 
            onClick={toggleVideo}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
              isVideoEnabled 
                ? 'bg-gray-700 hover:bg-gray-600' 
                : 'bg-red-600 hover:bg-red-700'
            }`}
            aria-label={isVideoEnabled ? 'Disable video' : 'Enable video'}
          >
            {isVideoEnabled ? (
              <svg className="w-6 h-6 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
              </svg>
            ) : (
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                <line x1="4" y1="4" x2="20" y2="20" stroke="red" strokeWidth="2" />
              </svg>
            )}
          </button>

          {/* End call button */}
          <button
            onClick={handleEndCall}
            className="w-14 h-14 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center transition-colors"
          >
            <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.18-.29-.43-.29-.71 0-.28.11-.53.29-.71C2.93 9.04 7.28 7.5 12 7.5s9.07 1.54 11.71 4.15c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.1-.7-.28-.79-.73-1.68-1.36-2.66-1.85-.33-.16-.56-.51-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}