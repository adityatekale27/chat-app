"use client";

import { getPusherClient } from "@/libs/pusher/pusherClient";
import SimplePeer, { Instance } from "simple-peer";
import { rtcConfig } from "@/libs/rtcConfig";
import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";

interface UseWebRTCProps {
  conversationId: string;
  fromUserId: string;
  toUserId: string;
}

export const useWebRTC = ({ conversationId, fromUserId, toUserId }: UseWebRTCProps) => {
  const pusherClient = getPusherClient();
  const callRef = useRef<string>("");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const peerRef = useRef<Instance | null>(null);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [incomingOffer, setIncomingOffer] = useState<string | SimplePeer.SignalData | null>(null);
  const [callActive, setCallActive] = useState(false);
  const [peerState, setPeerState] = useState<string>("");

  /* Create new peer */
  const createPeer = useCallback((isInitiator: boolean, stream: MediaStream) => {
    const newPeer = new SimplePeer({
      initiator: isInitiator,
      trickle: false,
      stream,
      config: rtcConfig,
    });

    newPeer.on("stream", (remoteStream) => setRemoteStream(remoteStream));

    newPeer.on("error", (err) => {
      console.error("Peer error:", err);
    });

    newPeer.on("close", () => {
      setCallActive(false);
      setPeerState("closed");
    });

    newPeer.on("connect", () => {
      setPeerState("connected");
    });

    peerRef.current = newPeer;
    return newPeer;
  }, []);

  /* Start the call with using call type */
  const startCall = useCallback(
    async (callType: "AUDIO" | "VIDEO") => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: callType === "VIDEO",
        });

        setLocalStream(stream);
        setPeerState("creating");

        const initiatorPeer = createPeer(true, stream);
        setPeer(initiatorPeer);

        initiatorPeer.on("signal", async (data) => {
          if (data.type === "offer") {
            setPeerState("offering");
            const response = await axios.post("/api/call/offer", {
              fromUserId,
              toUserId,
              conversationId,
              offer: data,
              callType,
            });
            callRef.current = response.data.callId;
          }

          setCallActive(true);
        });
      } catch (error) {
        console.error("Error starting call", error);
      }
    },
    [conversationId, createPeer, fromUserId, toUserId]
  );

  /* Answer call */
  const answerCall = useCallback(async () => {
    try {
      if (!incomingOffer) throw new Error("No incoming offer to answer");
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      setLocalStream(stream);
      setPeerState("answering");

      const responderPeer = createPeer(false, stream);
      setPeer(responderPeer);

      responderPeer.on("signal", async (data) => {
        if (data.type === "answer") {
          await axios.post("/api/call/answer", {
            callId: callRef.current,
            conversationId,
            answer: data,
            fromUserId,
          });
        }
      });

      // Apply the offer signal
      responderPeer.signal(incomingOffer);
      setCallActive(true);
    } catch (error) {
      console.log("answerCall error", error);
    }
  }, [conversationId, createPeer, fromUserId, incomingOffer]);

  /* End call */
  const endCall = useCallback(async () => {
    if (callRef.current) {
      await axios
        .post("/api/call/end", {
          callId: callRef.current,
          conversationId,
          fromUserId,
        })
        .catch((error) => {
          console.error("Error ending call", error);
        });
    }

    peerRef.current?.destroy();
    localStream?.getTracks().forEach((track) => track.stop());

    setCallActive(false);
    setPeer(null);
    setLocalStream(null);
    setRemoteStream(null);
    setIncomingOffer(null);
    callRef.current = "";

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [conversationId, fromUserId, localStream]);

  // Helper function to safely set the peer
  const setPeer = (newPeer: Instance | null) => {
    peerRef.current = newPeer;
  };

  // Toggle audio
  const toggleAudio = () => {
    localStream?.getAudioTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });
  };

  // Toggle video
  const toggleVideo = () => {
    localStream?.getVideoTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });
  };

  /* Subscribe to pusher events for call signaling */
  useEffect(() => {
    const channel = pusherClient.subscribe(`private-call-${conversationId}`);

    // bind offer event
    channel.bind("offer", (data: { offer: SimplePeer.SignalData; callId: string; fromUserId: string }) => {
      console.log("📞 Incoming offer:", data);
      setIncomingOffer(data.offer);
      callRef.current = data.callId;

      timeoutRef.current = setTimeout(() => {
        console.log("call timeout - no answer");
        endCall();
      }, 60000);
    });

    // bind answer event
    channel.bind("answer", (data: { answer: SimplePeer.SignalData; callId: string; fromUserId: string }) => {
      console.log("📩 Answer received:", data);

      // Only apply the answer if peer exists and is in a valid state
      if (peerRef.current && peerState === "offering") {
        try {
          peerRef.current.signal(data.answer);
        } catch (error) {
          console.error("Error applying answer:", error);
        }
      } else {
        console.warn(`Cannot apply answer, peer state: ${peerState}`);
      }
    });

    // bind candidate event
    channel.bind("candidate", (data: { candidate: SimplePeer.SignalData; callId: string; fromUserId: string }) => {
      console.log("🧩 ICE candidate received:", data);

      // Only apply candidate if peer exists
      if (peerRef.current) {
        try {
          peerRef.current.signal(data.candidate);
        } catch (error) {
          console.error("Error applying candidate:", error);
        }
      }
    });

    // bind end call event
    channel.bind("call-ended", (data: { callId: string; fromUserId: string; status: string }) => {
      console.log("Call ended:", data);

      try {
        endCall();
      } catch (error) {
        console.error("Error ending call", error);
      }
    });

    return () => {
      channel.unbind_all();
      pusherClient.unsubscribe(`private-call-${conversationId}`);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [conversationId, endCall, peerState, pusherClient]);

  return {
    incomingOffer,
    localStream,
    remoteStream,
    callActive,
    startCall,
    answerCall,
    endCall,
    toggleAudio,
    toggleVideo,
    peerState,
  };
};
