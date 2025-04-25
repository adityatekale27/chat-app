"use client";

import { useWebRTCContext } from "@/contexts/WebRTCContext";
import { IncomingCallBanner } from "@/components/dialogs/IncomingCallBanner";
import { VideoCallModal } from "@/components/dialogs/VideoCallModel";

export default function CallManager({ currentUser }: { currentUser: User }) {
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

  const isRealIncomingCall = incomingOffer && incomingUser && incomingUser.id !== currentUser?.id && !callActive;

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
        <VideoCallModal
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
