import React, { useEffect, useRef, useState } from "react";
import Peer, { MediaConnection, DataConnection } from "peerjs";

export default function App() {
  const [mode, setMode] = useState<null | "host" | "join">(null);
  const [peerId, setPeerId] = useState("");
  const [remoteId, setRemoteId] = useState("");
  const [peer, setPeer] = useState<Peer | null>(null);
  const [messages, setMessages] = useState<{ sender: string; text: string }[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [dataConn, setDataConn] = useState<DataConnection | null>(null);
  const [isCalling, setIsCalling] = useState(false);

  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const callRef = useRef<MediaConnection | null>(null);

  // Host mode: initialize peer and listen for connections
  useEffect(() => {
    if (mode === "host") {
      const p = new Peer();
      setPeer(p);

      p.on("open", (id) => setPeerId(id));

      // Handle incoming call
      p.on("call", (call) => {
        navigator.mediaDevices
          .getUserMedia({ video: true, audio: true })
          .then((stream) => {
            call.answer(stream);
            localStreamRef.current = stream;
            if (localVideoRef.current) localVideoRef.current.srcObject = stream;

            call.on("stream", (remoteStream) => {
              if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
            });

            callRef.current = call;
          })
          .catch(console.error);
      });

      // Handle incoming chat connection
      p.on("connection", (conn) => {
        setDataConn(conn);
        conn.on("data", (data) => {
          setMessages((prev) => [...prev, { sender: "Them", text: String(data) }]);
        });
      });

      return () => p.destroy();
    }
  }, [mode]);

  const startCall = () => {
    if (!peer || !remoteId) return;

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        const call = peer.call(remoteId, stream);
        if (!call) return;
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        call.on("stream", (remoteStream) => {
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
        });

        callRef.current = call;
        setIsCalling(true);
      })
      .catch(console.error);

    const conn = peer.connect(remoteId);
    conn.on("open", () => {
      setDataConn(conn);
    });
    conn.on("data", (data) => {
      setMessages((prev) => [...prev, { sender: "Them", text: String(data) }]);
    });
  };

  const endCall = () => {
    if (callRef.current) {
      callRef.current.close();
      callRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;

    if (dataConn) {
      dataConn.close();
      setDataConn(null);
    }
    setMessages([]);
    setMode(null);
  };

  const sendMessage = () => {
    if (inputMessage.trim() && dataConn) {
      dataConn.send(inputMessage);
      setMessages((prev) => [...prev, { sender: "You", text: inputMessage }]);
      setInputMessage("");
    }
  };

  // Step 1: Landing page
  if (!mode) {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-t from-slate-700 via-teal-500 to-slate-400 font-mono">
      <h1 className="text-4xl font-bold text-white mb-6">CHISMIZ</h1>

      {/* Host button */}
      <button
        onClick={() => setMode("host")}
        className="px-8 py-4 bg-teal-500 text-white font-bold rounded-lg hover:bg-teal-400 shadow-lg mb-4"
      >
        Host
      </button>

      {/* Join section */}
      <div className="flex flex-col items-center gap-4 bg-white p-6 rounded-lg shadow-md">
        <input
          type="text"
          placeholder="Enter Host ID"
          value={remoteId}
          onChange={(e) => setRemoteId(e.target.value)}
          className="w-64 p-3 rounded-lg border border-teal-400 shadow-inner bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <button
          onClick={() => {
            const p = new Peer();
            setPeer(p);
            p.on("open", () => setMode("join"));
          }}
          className="px-8 py-3 bg-slate-500 text-white font-bold rounded-lg hover:bg-slate-400 shadow-lg"
          disabled={!remoteId.trim()}
        >
          Join
        </button>
      </div>
    </div>
  );
}


  // Step 2: Main interface
  return (
    <div className="min-h-screen bg-gradient-to-t from-slate-700 via-teal-500 to-slate-400 flex flex-col items-center py-10 px-3 font-mono">
      <h1 className="text-4xl font-bold text-teal-800 drop-shadow-lg mb-2">CHISMIZ</h1>
      {mode === "host" && (
        <p className="mb-6 text-teal-900">
          Your ID:{" "}
          <strong className="bg-slate-200 px-2 py-1 rounded border border-teal-400">{peerId}</strong>
        </p>
      )}
      <div className="grid lg:grid-cols-3 items-center gap-3 w-full">

        <div className="relative w-full lg:col-span-2 aspect-video my-4 bg-black rounded-lg overflow-hidden shadow-lg border-4 border-teal-400">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="absolute bottom-4 right-4 md:w-40 md:h-28 w-20 h-13 object-cover rounded-lg shadow-md border-2 border-white"
          />
        </div>

        <div className="w-full h-fit max-w-7xl bg-white rounded-lg shadow-md p-4">
          <div className="lg:min-h-155 lg:max-h-155 max-h-50 min-h-50 overflow-y-auto border border-gray-300 p-2 rounded mb-2">
            {messages.map((msg, i) => (
              <div key={i} className={msg.sender === "You" ? "text-right" : "text-left"}>
                <span
                  className={`inline-block px-2 py-1 rounded mt-3 ${
                    msg.sender === "You" ? "bg-teal-300" : "bg-gray-200"
                  }`}
                >
                  <strong>{msg.sender}: </strong>
                  {msg.text}
                </span>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              className="flex-1 p-2 border border-gray-300 rounded"
              placeholder="Type a message..."
            />
            <button
              onClick={sendMessage}
              className="px-4 py-2 bg-teal-500 text-white rounded hover:bg-teal-400"
            >
              Send
            </button>
          </div>
        </div>

      </div>

      {/* {mode === "join" && (
        <input
          type="text"
          placeholder="Enter host ID"
          value={remoteId}
          onChange={(e) => setRemoteId(e.target.value)}
          className="w-80 p-3 rounded-lg mt-8 border border-teal-400 shadow-inner bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500 mb-6"
        />
      )} */}

     <div className="flex gap-4 lg:mt-6 mt-20">
        <button
          onClick={startCall}
          className={`px-6 py-2 rounded-lg ${isCalling ? 'bg-slate-500' : 'bg-teal-500'} text-white font-bold border-b-4 border-teal-700 hover:bg-teal-400 min-w-40 active:translate-y-1 transition-all`}
        >
          Start Call
        </button>
        <button
          onClick={endCall}
          className={`px-6 py-2 rounded-lg ${isCalling ? 'bg-teal-500' : 'bg-slate-500'} text-teal-900 font-bold border-b-4 border-slate-700 hover:bg-slate-400  min-w-40 active:translate-y-1 transition-all`}
        >
          End Call
        </button>
      </div>

    </div>
  );
}
