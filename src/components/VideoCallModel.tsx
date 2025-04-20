// "use client";
// import React, { useRef, useEffect, useState } from "react";
// import { Mic as MicrophoneIcon, MicOff as MicrophoneOffIcon, Video as VideoIcon, VideoOff as VideoOffIcon, PhoneOff as PhoneOffIcon } from "lucide-react";

// interface VideoCallModalProps {
//   localStream: MediaStream | null;
//   remoteStream: MediaStream | null;
//   onEndCall: () => void;
//   onToggleAudio?: () => void;
//   onToggleVideo?: () => void;
//   peerState?: string;
// }

// export const VideoCallModal: React.FC<VideoCallModalProps> = ({
//   localStream,
//   remoteStream,
//   onEndCall,
//   onToggleAudio,
//   onToggleVideo,
//   peerState
// }) => {
//   const localVideoRef = useRef<HTMLVideoElement>(null);
//   const remoteVideoRef = useRef<HTMLVideoElement>(null);
//   const [isAudioEnabled, setIsAudioEnabled] = useState(true);
//   const [isVideoEnabled, setIsVideoEnabled] = useState(true);
//   const [isFullScreen, setIsFullScreen] = useState(false);

//   useEffect(() => {
//     if (localVideoRef.current && localStream) {
//       localVideoRef.current.srcObject = localStream;
//     }
//   }, [localStream]);

//   useEffect(() => {
//     if (remoteVideoRef.current && remoteStream) {
//       remoteVideoRef.current.srcObject = remoteStream;
//     }
//   }, [remoteStream]);

//   const handleToggleAudio = () => {
//     if (onToggleAudio) {
//       onToggleAudio();
//       setIsAudioEnabled(!isAudioEnabled);
//     }
//   };

//   const handleToggleVideo = () => {
//     if (onToggleVideo) {
//       onToggleVideo();
//       setIsVideoEnabled(!isVideoEnabled);
//     }
//   };

//   const toggleFullScreen = () => {
//     setIsFullScreen(!isFullScreen);
//   };

//   return (
//     <div className="fixed inset-0 bg-gradient-to-br from-gray-900 to-black bg-opacity-95 flex flex-col items-center justify-center z-50 backdrop-blur-sm">
//       <div className={`relative ${isFullScreen ? 'w-full h-full' : 'w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl'}`}>
//         {/* Remote video (big screen) */}
//         {remoteStream ? (
//           <video
//             ref={remoteVideoRef}
//             autoPlay
//             playsInline
//             className={`w-full ${isFullScreen ? 'h-full object-cover' : 'h-auto rounded-2xl'} bg-gray-800`}
//           />
//         ) : (
//           <div className="w-full h-96 flex items-center justify-center bg-gray-800 rounded-2xl">
//             <div className="text-center">
//               <div className="inline-block p-6 bg-gray-700 rounded-full mb-4">
//                 <div className="w-16 h-16 rounded-full bg-gray-500 flex items-center justify-center">
//                   <span className="text-3xl text-white">?</span>
//                 </div>
//               </div>
//               <p className="text-gray-300 text-lg">
//                 {peerState === "offering" ? "Calling..." : "Waiting for remote video..."}
//               </p>
//             </div>
//           </div>
//         )}

//         {/* Local video (small inset) */}
//         <div className="absolute top-5 right-5 w-48 h-36 rounded-lg overflow-hidden shadow-lg border-2 border-white border-opacity-30 transition-all hover:scale-105">
//           {localStream ? (
//             <video
//               ref={localVideoRef}
//               autoPlay
//               playsInline
//               muted
//               className="w-full h-full object-cover bg-gray-700"
//             />
//           ) : (
//             <div className="w-full h-full bg-gray-700 flex items-center justify-center">
//               <span className="text-white text-opacity-70">No local video</span>
//             </div>
//           )}
//         </div>

//         {/* Call duration timer could be added here */}

//         {/* Bottom controls */}
//         <div className="absolute bottom-0 left-0 right-0 px-6 py-4 bg-gradient-to-t from-black to-transparent">
//           <div className="flex items-center justify-center space-x-4">
//             {/* Audio toggle */}
//             <button
//               onClick={handleToggleAudio}
//               className={`p-4 rounded-full ${isAudioEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'} transition-colors`}
//             >
//               {isAudioEnabled ? (
//                 <MicrophoneIcon className="w-6 h-6 text-white" />
//               ) : (
//                 <MicrophoneOffIcon className="w-6 h-6 text-white" />
//               )}
//             </button>

//             {/* Video toggle */}
//             <button
//               onClick={handleToggleVideo}
//               className={`p-4 rounded-full ${isVideoEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'} transition-colors`}
//             >
//               {isVideoEnabled ? (
//                 <VideoIcon className="w-6 h-6 text-white" />
//               ) : (
//                 <VideoOffIcon className="w-6 h-6 text-white" />
//               )}
//             </button>

//             {/* End call button */}
//             <button
//               onClick={onEndCall}
//               className="p-4 bg-red-600 hover:bg-red-700 rounded-full transition-transform hover:scale-110"
//             >
//               <PhoneOffIcon className="w-6 h-6 text-white" />
//             </button>

//             {/* Fullscreen toggle */}
//             <button
//               onClick={toggleFullScreen}
//               className="p-4 bg-gray-700 hover:bg-gray-600 rounded-full"
//             >
//               <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                 {isFullScreen ? (
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3" />
//                 ) : (
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 3h6m0 0v6m0-6L13 11m-9 9h6m-6 0v-6m0 6l8-8" />
//                 )}
//               </svg>
//             </button>
//           </div>
//         </div>
//       </div>

//       {/* Connection status indicator */}
//       {peerState && (
//         <div className="mt-4 px-3 py-1 rounded-full bg-gray-800 bg-opacity-70">
//           <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
//             peerState === "connected" ? "bg-green-500" :
//             peerState === "offering" || peerState === "answering" ? "bg-yellow-500" : "bg-red-500"
//           }`}></span>
//           <span className="text-sm text-white">
//             {peerState === "connected" ? "Connected" :
//              peerState === "offering" ? "Calling..." :
//              peerState === "answering" ? "Connecting..." :
//              peerState === "closed" ? "Disconnected" : peerState}
//           </span>
//         </div>
//       )}
//     </div>
//   );
// };

"use client";
import React, { useRef, useEffect, useState } from "react";
import { Mic as MicrophoneIcon, MicOff as MicrophoneOffIcon, Video as VideoIcon, VideoOff as VideoOffIcon, PhoneOff as PhoneOffIcon } from "lucide-react";

interface VideoCallModalProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onEndCall: () => void;
  onToggleAudio?: () => void;
  onToggleVideo?: () => void;
  peerState?: string;
}

export const VideoCallModal: React.FC<VideoCallModalProps> = ({ localStream, remoteStream, onEndCall, onToggleAudio, onToggleVideo, peerState }) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [callDuration, setCallDuration] = useState(0);


  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

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
      <div className={`relative w-full max-w-[90%] lg:max-w-[70%] max-h-[95%] h-dvh rounded-xl overflow-hidden shadow-xl`}>
        {/* Remote Video Feed */}
        {remoteStream ? (
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-dvh aspect-video object-cover bg-black" />
        ) : (
          <div className="w-full min-h-full rounded-lg aspect-video bg-gray-900 flex items-center justify-center text-gray-400 text-center px-4 text-sm">
            {peerState === "offering" ? "Calling..." : "Waiting for remote video..."}
          </div>
        )}

        {/* Local Video Feed */}
        <div className="absolute top-4 right-3 w-28 h-20 sm:w-40 sm:h-28 bg-black/30 rounded-lg overflow-hidden border border-white/10 shadow-md">
          {localStream ? (
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/50 text-xs">No local video</div>
          )}
        </div>

        {/* Controls */}
        {peerState === "connected" && <div className="bg-black/60 text-white text-sm px-3 py-1 rounded-full shadow-md">{formatDuration(callDuration)}</div>}
        <div className="absolute pb-6 bottom-0 left-0 right-0 py-3 px-4 bg-gradient-to-t from-black/70 to-transparent flex flex-wrap justify-center gap-3 sm:gap-5">
          <button
            onClick={handleToggleAudio}
            className={`hover:cursor-pointer rounded-full p-3 transition-all hover:scale-105 ${isAudioEnabled ? "bg-white/10 hover:bg-white/20" : "bg-red-600 hover:bg-red-700"}`}>
            {isAudioEnabled ? <MicrophoneIcon className="w-5 h-5 text-white" /> : <MicrophoneOffIcon className="w-5 h-5 text-white" />}
          </button>

          <button
            onClick={handleToggleVideo}
            className={`hover:cursor-pointer rounded-full p-3 transition-all hover:scale-105 ${isVideoEnabled ? "bg-white/10 hover:bg-white/20" : "bg-red-600 hover:bg-red-700"}`}>
            {isVideoEnabled ? <VideoIcon className="w-5 h-5 text-white" /> : <VideoOffIcon className="w-5 h-5 text-white" />}
          </button>

          <button onClick={onEndCall} className="hover:cursor-pointer bg-red-600 hover:bg-red-700 rounded-full p-3 transition-transform hover:scale-110">
            <PhoneOffIcon className="w-5 h-5 text-white" />
          </button>
        </div>

        {peerState === "connected" && (
          <div className="absolute bottom-22 left-1/2 transform -translate-x-1/2 bg-black/60 text-white text-sm px-3 py-1 rounded-full shadow-md">
            {formatDuration(callDuration)}
          </div>
        )}

        {/* Peer connection status */}
        {peerState && (
          <div className="absolute top-3 left-3 px-3 py-1 bg-white/10 rounded-full text-xs sm:text-sm text-white flex items-center space-x-2">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
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
