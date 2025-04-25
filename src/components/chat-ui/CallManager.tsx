"use client";

import { useWebRTCContext } from "@/contexts/WebRTCContext";
import { IncomingCallBanner } from "@/components/dialogs/IncomingCallBanner";
import { CallModel } from "@/components/dialogs/CallModel";

export default function CallManager() {
  const {
    endCallLoading,
    audioCallLoading,
    videoCallLoading,
    callActive,
    incomingCallType,
    incomingOffer,
    incomingUser,
    answerCall,
    endCall,
    localStream,
    remoteStream,
    toggleAudio,
    toggleVideo,
    peerState,
  } = useWebRTCContext();

  const isRealIncomingCall = incomingOffer && incomingUser && !callActive;

  return (
    <>
      {/* Show incoming call banner */}
      {isRealIncomingCall && (
        <IncomingCallBanner
          endCallLoading={endCallLoading}
          audioCallLoading={audioCallLoading}
          videoCallLoading={videoCallLoading}
          otherUser={incomingUser}
          onAccept={() => answerCall()}
          onReject={endCall}
          callType={incomingCallType}
        />
      )}

      {/* Show video/audio call modal */}
      {callActive && incomingUser && (
        <CallModel
          endCallLoading={endCallLoading}
          otherUser={incomingUser}
          localStream={localStream}
          remoteStream={remoteStream}
          onEndCall={endCall}
          onToggleAudio={toggleAudio}
          onToggleVideo={toggleVideo}
          peerState={peerState}
          mode={incomingCallType}
        />
      )}
    </>
  );
}
