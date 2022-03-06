import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import Peer from "simple-peer";
import './App.css';
import { CopyToClipboard } from 'react-copy-to-clipboard';


const socket = io.connect("http://localhost:5000");

function App() {
  const [me, setMe] = useState("");
  const [stream, setStream] = useState();
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState("");
  const [callerSignal, setCallerSignal] = useState();
  const [callAccepted, setCallAccepted] = useState(false);
  const [idToCall, setIdToCall] = useState("");
  const [callEnded, setCallEnded] = useState(false);
  const [name, setName] = useState("");
  const [copied, setCopied] = useState(false);

  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();
  useEffect(() => {
    if (copied) {
      setTimeout(function () {
        setCopied(false);

      }, 3000);
    }
  }, [copied])
  const leaveCall = () => {
    setCallEnded(true);
    connectionRef.current.destroy();
  }
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
      setStream(stream);
      myVideo.current.srcObject = stream;
    })

    socket.on("me", (id) => setMe(id));

    socket.on("callUser", (data) => {
      setReceivingCall(true);
      setCaller(data.from);
      setName(data.name);
      setCallerSignal(data.signal);
    })
  }, [])

  const callUser = (id) => {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: stream
    })

    peer.on("signal", (data) => {
      socket.emit("callUser", {
        userToCall: id,
        signalData: data,
        from: me,
        name: name
      })
    })

    peer.on("stream", (stream) => {
      userVideo.current.srcObject = stream;
    })

    socket.on("callAccepted", (signal) => {
      setCallAccepted(true);
      peer.signal = signal;
    })

    connectionRef.current = peer;
  }

  const answerCall = () => {
    setCallAccepted(true);
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: stream
    })

    peer.on("signal", (data) => {
      socket.emit("answerCall", {
        signal: data,
        to: caller
      })
    })


    if (userVideo.current) {
      peer.on("stream", (stream) => {
        userVideo.current.srcObject = stream;
      })
    }


    peer.signal(callerSignal)
    connectionRef.current = peer;

  }


  return (
    <div className="App" >
      <h1 className="title">Video Calling App</h1>
      <div className="video-container">
        <div className="video">
          {stream && <video playsInline muted ref={myVideo} autoPlay style={{ width: "400px" }} />}
        </div>
        <div className="video">
          {callAccepted && !callEnded ? <video playsInline muted ref={myVideo} autoPlay style={{ width: "400px" }} /> : null}
        </div>
      </div>
      <div className="myId">
        <input
          id="filled-basic"
          label="Name"
          className="input-field"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <CopyToClipboard text={me} className="clip-board">
          <button onClick={() => setCopied(true)}>Copy Id</button>
        </CopyToClipboard>

        <input
          className="input-field"
          placeholder="Id"
          onChange={(e) => setIdToCall(e.target.value)}
        />


      </div>
      {copied && <h1 style={{ color: "white" }}>Successfully Copied!</h1>}
      <div className="callButton">

        {callAccepted && !callEnded ? (
          <button onClick={leaveCall} className="close-call-button"><i className="fas fa-times"></i></button>
        ) : (
          <button onClick={() => callUser(idToCall)} className="outgoing-call-button"><i className="fas fa-phone"></i></button>

        )}

      </div>
      <div>
        {receivingCall && !callAccepted ? (
          <div className="caller">
            <h1>{name} is Calling....</h1>
            <button className="outgoing-call-button" onClick={answerCall}>
              <i className="fas fa-phone-volume"></i>
            </button>
          </div>
        ) : null}
      </div>
    </div >
  );
}

export default App;
