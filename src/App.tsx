import React, { useState } from "react";
import "./style.css";
import Custom3DModel from "./Custom3DModel";
import Whiteboard from "./Whiteboard";

const App: React.FC = () => {
  const [activeComponent, setActiveComponent] = useState<"whiteboard" | "3dmodel">("whiteboard");
  const [showDoubts, setShowDoubts] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Callback to update unread count from Whiteboard
  const handleUnreadChange = (count: number) => {
    setUnreadCount(count);
  };

  return (
    <div className="container">
      <h1>AI Smart Board</h1>
      <div className="nav-buttons">
        <button 
          onClick={() => setActiveComponent("whiteboard")}
          className={activeComponent === "whiteboard" ? "active" : ""}
        >
          Whiteboard
        </button>
        <button 
          onClick={() => setActiveComponent("3dmodel")}
          className={activeComponent === "3dmodel" ? "active" : ""}
        >
          3D Model Generator
        </button>
        <button 
          className="doubt-nav-btn"
          onClick={() => setShowDoubts(!showDoubts)}
        >
          💬 Doubts
          {unreadCount > 0 && (
            <span className="doubt-badge">{unreadCount}</span>
          )}
        </button>
      </div>
      <div className="content">
        {activeComponent === "whiteboard" ? (
          <Whiteboard 
            showDoubts={showDoubts} 
            setShowDoubts={setShowDoubts}
            onUnreadChange={handleUnreadChange}
          />
        ) : (
          <Custom3DModel />
        )}
      </div>
    </div>
  );
};

export default App;
