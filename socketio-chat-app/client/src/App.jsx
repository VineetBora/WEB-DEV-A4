import { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { ArrowUp, Hash, MessageCircle, Radio, Send, Wifi, WifiOff } from "lucide-react";
const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";

export default function App() {
  const socket = useMemo(() => io(SERVER_URL, { autoConnect: false }), []);
  const [connected, setConnected] = useState(false);
  const [joined, setJoined] = useState(false);
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("general");
  const [draftName, setDraftName] = useState("");
  const [draftRoom, setDraftRoom] = useState("general");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);
  const typingTimer = useRef(null);

  useEffect(() => {
    const onConnect = () => setConnected(true);
    const onDisconnect = () => { setConnected(false); setJoined(false); };
    const onReceive = (msg) => setMessages((prev) => [...prev, msg]);
    const onSystem = (msg) => setMessages((prev) => [...prev, { ...msg, system: true, _id: `${Date.now()}-${Math.random()}` }]);
    const onUsers = (list) => setUsers(list);
    const onTyping = ({ username: name, isTyping }) => setTypingUsers((prev) => isTyping ? (prev.includes(name) ? prev : [...prev, name]) : prev.filter((item) => item !== name));
    socket.on("connect", onConnect); socket.on("disconnect", onDisconnect);
    socket.on("receive_message", onReceive); socket.on("system_message", onSystem);
    socket.on("room_users", onUsers); socket.on("user_typing", onTyping);
    return () => { socket.off("connect", onConnect); socket.off("disconnect", onDisconnect); socket.off("receive_message", onReceive); socket.off("system_message", onSystem); socket.off("room_users", onUsers); socket.off("user_typing", onTyping); socket.disconnect(); clearTimeout(typingTimer.current); };
  }, [socket]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, typingUsers]);

  const joinRoom = () => {
    const name = draftName.trim(), selectedRoom = draftRoom.trim().toLowerCase();
    if (!name || !selectedRoom) { setError("Please enter your name and a room."); return; }
    setError("");
    const join = () => socket.emit("join_room", { username: name, room: selectedRoom }, (result) => {
      if (!result?.ok) { setError(result?.error || "Could not join room."); return; }
      setUsername(name); setRoom(selectedRoom); setMessages(result.history || []); setJoined(true);
    });
    if (socket.connected) join(); else { socket.connect(); socket.once("connect", join); }
  };
  const sendMessage = (event) => {
    event?.preventDefault(); if (!message.trim() || !joined) return;
    socket.emit("send_message", { text: message.trim() }, (result) => { if (!result?.ok) setError(result?.error || "Message failed."); });
    setMessage(""); socket.emit("typing", false);
  };
  const handleTyping = (value) => {
    setMessage(value); if (!joined) return;
    socket.emit("typing", Boolean(value.trim())); clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => socket.emit("typing", false), 900);
  };
  const formatTime = (date) => new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return <main className="app-shell"><section className="chat-window">
    <aside className="sidebar"><div className="brand"><div className="brand-icon"><MessageCircle size={21}/></div><div><strong>LoopChat</strong><span>good conversations, live</span></div></div>
      <div className="side-label">YOUR SPACE</div><div className="room-card active"><Hash size={17}/><span>{joined ? room : "general"}</span><i/></div>
      <div className="side-label people-label">IN THIS ROOM <span>{users.length}</span></div><div className="people-list">{users.map((person,index)=><div className="person" key={`${person}-${index}`}><div className="avatar">{person.slice(0,1).toUpperCase()}</div><span>{person}{person===username?" (you)":""}</span><i/></div>)}{!users.length&&<p className="muted small">No one here yet</p>}</div>
      <div className="sidebar-bottom"><div className={`connection-dot ${connected?"online":""}`}/><span>{connected?"Connected to server":"Not connected"}</span></div>
    </aside>
    <section className="main-panel"><header className="topbar"><div className="room-heading"><div className="hash-icon"><Hash size={19}/></div><div><h1>{joined?room:"Welcome to LoopChat"}</h1><p>{joined?"A little space for good conversations":"Real-time messaging, made simple"}</p></div></div><div className={`status-pill ${connected?"is-online":""}`}>{connected?<Wifi size={14}/>:<WifiOff size={14}/>} {connected?"Live":"Offline"}</div></header>
      {!joined?<div className="welcome-wrap"><div className="welcome-card"><div className="welcome-art"><div className="art-bubble bubble-one">Hey there!</div><div className="art-bubble bubble-two">👋</div><div className="art-orbit"><MessageCircle size={42}/></div></div><div className="welcome-copy"><span className="eyebrow">YOUR CONVERSATION STARTS HERE</span><h2>Make room for<br/><em>good conversations.</em></h2><p>Choose a name and a room to join. Messages appear instantly for everyone in the same room.</p></div>
        <form className="join-form" onSubmit={(e)=>{e.preventDefault();joinRoom();}}><label>Your display name</label><input value={draftName} onChange={(e)=>setDraftName(e.target.value)} placeholder="e.g. Alex" maxLength={24}/><label>Room name</label><div className="room-input"><Hash size={17}/><input value={draftRoom} onChange={(e)=>setDraftRoom(e.target.value)} placeholder="general" maxLength={40}/></div>{error&&<p className="error-text">{error}</p>}<button className="primary-button" type="submit">Join conversation <ArrowUp size={17}/></button></form></div></div>:
      <><div className="messages-area"><div className="date-divider"><span>MESSAGES</span></div>{messages.map((msg)=>(msg.system?<div className="system-message" key={msg._id}><span>{msg.text}</span></div>:<div className={`message-row ${msg.username===username?"mine":""}`} key={msg._id||`${msg.createdAt}-${msg.username}`}><div className="avatar message-avatar">{msg.username.slice(0,1).toUpperCase()}</div><div className="message-content"><div className="message-meta"><strong>{msg.username===username?"You":msg.username}</strong><time>{formatTime(msg.createdAt)}</time></div><div className="message-bubble">{msg.text}</div></div></div>))}{typingUsers.length>0&&<div className="typing-line"><span className="typing-dots"><i/><i/><i/></span>{typingUsers.join(", ")} {typingUsers.length===1?"is":"are"} typing...</div>}<div ref={bottomRef}/></div>
        <form className="composer" onSubmit={sendMessage}><div className="composer-inner"><input value={message} onChange={(e)=>handleTyping(e.target.value)} placeholder={`Message #${room}...`} maxLength={2000} aria-label="Write a message"/><button type="submit" disabled={!message.trim()} aria-label="Send message"><Send size={18}/></button></div><div className="composer-hint"><span>Press <kbd>Enter</kbd> to send</span><span>{message.length}/2000</span></div></form></>}
      {error&&joined&&<div className="toast-error">{error}<button onClick={()=>setError("")}>×</button></div>}
    </section></section><footer className="page-footer"><span>LOOPCHAT</span><span><Radio size={13}/> REAL-TIME MESSAGING POWERED BY SOCKET.IO</span></footer></main>;
}
