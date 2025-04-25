"use client";

import { getPusherClient } from "@/libs/pusher/pusherClient";
import SimplePeer, { Instance } from "simple-peer";
import { rtcConfig } from "@/libs/rtcConfig";
import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";

interface UseWebRTCProps {
  conversationId: string;
  fromUserId: string;
  toUserId: string;
}

export const useWebRTC = () => {
  const pusherClient = getPusherClient();
  const { data: session } = useSession();
  const currentUser = session?.user;

  const callRef = useRef<string>(""); // Current call id
  const timeoutRef = useRef<NodeJS.Timeout | null>(null); // For auto end if no answer
  const peerRef = useRef<Instance | null>(null); // Peer connection reference
  const conversationIdRef = useRef<string>("");
  const fromUserIdRef = useRef<string>("");
  const toUserIdRef = useRef<string>("");

  const [videoCallLoading, setVideoCallLoading] = useState(false);
  const [audioCallLoading, setAudioCallLoading] = useState(false);
  const [endCallLoading, setEndCallLoading] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [incomingOffer, setIncomingOffer] = useState<string | SimplePeer.SignalData | null>(null);
  const [callActive, setCallActive] = useState(false);
  const [peerState, setPeerState] = useState<string>("");
  const [incomingCallType, setIncomingCallType] = useState<"AUDIO" | "VIDEO">("VIDEO");
  const [incomingUser, setIncomingUser] = useState<User | null>(null);

  // Helper function to safely set the peer
  const setPeer = (newPeer: Instance | null) => {
    peerRef.current = newPeer;
  };

  /* Create new peer connection */
  const createPeer = useCallback((isInitiator: boolean, stream: MediaStream) => {
    const newPeer = new SimplePeer({
      initiator: isInitiator,
      trickle: false,
      stream,
      config: rtcConfig,
    });

    newPeer.on("stream", (remoteStream) => setRemoteStream(remoteStream));
    newPeer.on("connect", () => setPeerState("connected"));
    newPeer.on("close", () => {
      setCallActive(false);
      setPeerState("closed");
    });
    newPeer.on("error", (error) => console.error("Peer error:", error));

    setPeer(newPeer);
    return newPeer;
  }, []);

  /* Start the call with using call type */
  const startCall = useCallback(
    async (callType: "AUDIO" | "VIDEO", { conversationId, fromUserId, toUserId }: UseWebRTCProps) => {
      try {
        if (callType === "VIDEO") {
          setVideoCallLoading(true);
        } else {
          setAudioCallLoading(true);
        }

        conversationIdRef.current = conversationId;
        fromUserIdRef.current = fromUserId;
        toUserIdRef.current = toUserId;

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: callType === "VIDEO",
        });

        setLocalStream(stream);
        setPeerState("creating");

        const initiatorPeer = createPeer(true, stream);

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
        toast.error("Failed to start call");
        console.error("Error starting call", error);
      } finally {
        setAudioCallLoading(false);
        setVideoCallLoading(false);
      }
    },
    [createPeer]
  );

  /* Answer an incoming call */
  const answerCall = useCallback(async () => {
    try {
      if (incomingCallType === "VIDEO") {
        setVideoCallLoading(true);
      } else {
        setAudioCallLoading(true);
      }

      if (!incomingOffer) throw new Error("No incoming offer to answer");
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: incomingCallType === "VIDEO" });
      setLocalStream(stream);
      setPeerState("answering");

      const responderPeer = createPeer(false, stream);

      responderPeer.on("signal", async (data) => {
        if (data.type === "answer") {
          await axios.post("/api/call/answer", {
            callId: callRef.current,
            conversationId: conversationIdRef.current,
            answer: data,
            fromUserId: fromUserIdRef.current,
          });
        }
      });

      responderPeer.signal(incomingOffer);
      setCallActive(true);
    } catch (error) {
      toast.error("Failed to answer call");
      console.log("answerCall error", error);
    } finally {
      setVideoCallLoading(false);
      setAudioCallLoading(false);
    }
  }, [createPeer, incomingCallType, incomingOffer]);

  /* End call */
  const endCall = useCallback(async () => {
    try {
      setEndCallLoading(true);
      if (callRef.current) {
        await axios
          .post("/api/call/end", {
            callId: callRef.current,
            conversationId: conversationIdRef.current,
            fromUserId: fromUserIdRef.current,
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
      setIncomingUser(null);
      callRef.current = "";
      conversationIdRef.current = "";
      toUserIdRef.current = "";
      fromUserIdRef.current = "";

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    } catch (error) {
      toast.error("Failed to end call");
      console.error("Error ending call:", error);
    } finally {
      setEndCallLoading(false);
    }
  }, [localStream]);

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
    const channel = pusherClient.subscribe(`private-user-${currentUser?.id}`);

    // bind offer event
    channel.bind("offer", (data: { user: User; conversationId: string; offer: SimplePeer.SignalData; callId: string; fromUserId: string; callType: "AUDIO" | "VIDEO" }) => {
      setIncomingOffer(data.offer);
      setIncomingCallType(data.callType);
      setIncomingUser(data.user);

      callRef.current = data.callId;
      conversationIdRef.current = data.conversationId;
      toUserIdRef.current = data.user.id;
      fromUserIdRef.current = data.fromUserId;

      timeoutRef.current = setTimeout(() => {
        console.log("call timeout - no answer");
        endCall();
      }, 60000);
    });

    // bind answer event
    channel.bind("answer", (data: { answer: SimplePeer.SignalData; callId: string; fromUserId: string }) => {
      if (peerRef.current && peerState === "offering") {
        try {
          peerRef.current.signal(data.answer);
        } catch (error) {
          console.error("Error applying answer:", error);
        }
      }
    });

    // bind candidate event
    // channel.bind("candidate", (data: { candidate: SimplePeer.SignalData; callId: string; fromUserId: string }) => {
    //   console.log("🧩 ICE candidate received:", data);

    //   // Only apply candidate if peer exists
    //   if (peerRef.current) {
    //     try {
    //       peerRef.current.signal(data.candidate);
    //     } catch (error) {
    //       console.error("Error applying candidate:", error);
    //     }
    //   }
    // });

    // bind end call event

    channel.bind("call-ended", () => {
      try {
        endCall();
      } catch (error) {
        console.error("Error ending call", error);
      }
    });

    return () => {
      channel.unbind_all();
      pusherClient.unsubscribe(`private-user-${currentUser?.id}`);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [currentUser?.id, endCall, peerState, pusherClient]);

  return {
    audioCallLoading,
    videoCallLoading,
    endCallLoading,
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
    incomingCallType,
    incomingUser,
  };
};
