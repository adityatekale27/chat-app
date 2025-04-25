"use client";

import React, { useRef, useEffect, useState } from "react";
import { Mic as MicrophoneIcon, MicOff as MicrophoneOffIcon, Video as VideoIcon, VideoOff as VideoOffIcon, PhoneOff as PhoneOffIcon, Loader2 } from "lucide-react";

interface VideoCallModalProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onEndCall: () => void;
  onToggleAudio?: () => void;
  onToggleVideo?: () => void;
  peerState?: string;
  mode?: "VIDEO" | "AUDIO";
  otherUser: User;
  endCallLoading: boolean;
}

export const CallModel: React.FC<VideoCallModalProps> = ({
  endCallLoading,
  otherUser,
  localStream,
  remoteStream,
  onEndCall,
  onToggleAudio,
  onToggleVideo,
  peerState,
  mode = "VIDEO",
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [isLocalSpeaking, setIsLocalSpeaking] = useState(false);
  const [isRemoteSpeaking, setIsRemoteSpeaking] = useState(false);

  // Attach local stream to video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Attach remote stream to video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Attach remote audio stream in audio element
  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Track call duration
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (peerState === "connected") {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [peerState]);

  // Detect speech activity in a stream
  const detectSpeech = (stream: MediaStream, setSpeaking: (val: boolean) => void) => {
    const audioCtx = new AudioContext();
    const analyser = audioCtx.createAnalyser();
    const source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    let isMounted = true;

    const update = () => {
      if (!isMounted) return;
      analyser.getByteFrequencyData(data);
      const volume = data.reduce((a, b) => a + b, 0) / data.length;
      setSpeaking(volume > 25);
      requestAnimationFrame(update);
    };

    update();

    return () => {
      isMounted = false;
      source.disconnect();
      analyser.disconnect();
      audioCtx.close();
    };
  };

  // Start voice detection when streams are available
  useEffect(() => {
    if (localStream) detectSpeech(localStream, setIsLocalSpeaking);
    if (remoteStream) detectSpeech(remoteStream, setIsRemoteSpeaking);
  }, [localStream, remoteStream]);

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const handleToggleAudio = () => {
    onToggleAudio?.();
    setIsAudioEnabled((prev) => !prev);
  };

  const handleToggleVideo = () => {
    onToggleVideo?.();
    setIsVideoEnabled((prev) => !prev);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-[90%] lg:max-w-[70%] max-h-[95%] h-dvh rounded-xl overflow-hidden shadow-xl">
        {mode === "VIDEO" ? (
          <>
            {remoteStream && localStream ? (
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-dvh aspect-video object-cover bg-black" />
            ) : (
              <div className="w-full h-full bg-slate-900/80 flex items-center justify-center text-gray-400 text-center text-sm">
                {peerState === "offering" ? "Calling..." : "Waiting for remote video..."}
              </div>
            )}

            {/* Local stream */}
            <div className="absolute top-4 right-3 w-28 h-20 sm:w-40 sm:h-28 bg-black/30 rounded-lg overflow-hidden border border-white/10 shadow-md">
              {localStream ? (
                <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/50 text-xs">No local video</div>
              )}
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col">
            <div className="flex-1 flex flex-col items-center justify-center bg-slate-900/50">
              <div className={`relative w-24 h-24 rounded-full border-4 mb-2 transition-all ${isRemoteSpeaking ? "border-green-500 animate-pulse" : "border-white/10"}`} />
              <p className="text-white">{otherUser.name}</p>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center bg-slate-800/80">
              <div className={`w-22 h-22 rounded-full border-4 mb-2 transition-all ${isLocalSpeaking ? "border-green-500 animate-pulse" : "border-white/10"}`} />
              <p className="text-white">You</p>
            </div>
            <audio ref={remoteAudioRef} autoPlay />
          </div>
        )}

        {/* Controls */}
        {peerState === "connected" && (
          <div className="absolute bottom-22 left-1/2 transform -translate-x-1/2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full shadow-md">
            {formatDuration(callDuration)}
          </div>
        )}

        <div className="absolute pb-6 bottom-0 left-0 right-0 py-3 px-4 bg-gradient-to-t from-black/70 to-transparent flex flex-wrap justify-center gap-3 sm:gap-5">
          <button
            onClick={handleToggleAudio}
            className={`hover:cursor-pointer rounded-full p-3 transition-all hover:scale-105 ${isAudioEnabled ? "bg-white/10 hover:bg-white/20" : "bg-red-600 hover:bg-red-700"}`}>
            {isAudioEnabled ? <MicrophoneIcon className="w-5 h-5 text-white" /> : <MicrophoneOffIcon className="w-5 h-5 text-white" />}
          </button>

          {mode === "VIDEO" && (
            <button
              onClick={handleToggleVideo}
              className={`hover:cursor-pointer rounded-full p-3 transition-all hover:scale-105 ${
                isVideoEnabled ? "bg-white/10 hover:bg-white/20" : "bg-red-600 hover:bg-red-700"
              }`}>
              {isVideoEnabled ? <VideoIcon className="w-5 h-5 text-white" /> : <VideoOffIcon className="w-5 h-5 text-white" />}
            </button>
          )}

          <button onClick={onEndCall} className="hover:cursor-pointer bg-red-600 hover:bg-red-700 rounded-full p-3 transition-transform hover:scale-110">
            {endCallLoading ? <Loader2 className="animate-spin h-5 w-5" /> : <PhoneOffIcon className="w-5 h-5 text-white" />}
          </button>
        </div>

        {/* Peer connection status */}
        {peerState && (
          <div className="absolute top-3 left-3 px-3 py-1 bg-white/10 rounded-full text-xs sm:text-sm text-white flex items-center space-x-2">
            <span
              className={`inline-block w-2 h-2 rounded-full mt-1 ${
                peerState === "connected" ? "bg-green-500" : peerState === "offering" || peerState === "answering" ? "bg-yellow-500" : "bg-red-500"
              }`}
            />
            <span>{peerState === "connected" ? "Connected" : peerState}</span>
          </div>
        )}
      </div>
    </div>
  );
};
