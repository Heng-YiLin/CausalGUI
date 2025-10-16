import { useState } from "react";
import { useDnD } from "../DnDContext";
import DownloadButton from "../DownloadButton";

import {
  SquarePlus,
  MessageCircleQuestionMark,
  RefreshCcwDot,
  CircleQuestionMark,
} from "lucide-react";

const DnDComponent = () => {
  const [_, setType] = useDnD();
  const [showHelp, setShowHelp] = useState(false);
  const [showLoops, setShowLoops] = useState(() => {
    try {
      const v = localStorage.getItem("cld.showLoops");
      return v === null ? true : v !== "false";
    } catch {
      return true;
    }
  });

  // Create a handler that returns the actual drag handler
  const handleDragStart = (nodeType) => (event) => {
    event.dataTransfer.setData("text/plain", nodeType);
    event.dataTransfer.effectAllowed = "move";
    setType(nodeType);
    console.log("Drag started with type:", nodeType);
  };
  const toggleLoops = () => {
    const next = !showLoops;
    setShowLoops(next);
    try {
      localStorage.setItem("cld.showLoops", String(next));
    } catch {}
    // notify other components to re-read the setting
    window.dispatchEvent(new Event("storage-update"));
  };

  return (
    <>
      <aside
        style={{ display: "flex", flexDirection: "column", height: "100%" }}
      >
        <div
          className="dndnode input"
          onDragStart={handleDragStart("custom")}
          draggable
          title="Drag to add node"
        >
          <SquarePlus
            style={{ verticalAlign: "middle", marginRight: "0.5rem" }}
          />
        </div>

        <div
          style={{ marginTop: "1rem" }}
          type="button"
          onClick={toggleLoops}
          title="Toggle R/B loop labels"
        >
          <RefreshCcwDot
            style={{ verticalAlign: "middle", marginRight: "0.5rem" }}
          />
        </div>
        <div title="Download Image">
          <DownloadButton />
        </div>
        <div
          title="Help / Documentation"
          onClick={() => setShowHelp(true)}
          style={{ marginTop: "auto", cursor: "pointer" }}
        >
          <MessageCircleQuestionMark />
        </div>
      </aside>
      {showHelp && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
          }}
          onClick={() => setShowHelp(false)}
        >
          <div
            style={{
              background: "#fff",
              padding: 24,
              borderRadius: 8,
              maxWidth: 400,
              textAlign: "center",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CircleQuestionMark />
              Help
            </h2>

            <p
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              Drag the <SquarePlus /> icon to the CLD area to add a node.
            </p>

            <p
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              Use the <DownloadButton /> button to download the CLD image.
            </p>

            <p
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              Use the <MessageCircleQuestionMark /> toggle loop (R/B) labels.
            </p>




        

            <button
              onClick={() => setShowHelp(false)}
              style={{
                border: "2px solid #333",
                padding: "5px 10px",
                borderRadius: "8px",
                backgroundColor: "white",
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default DnDComponent;
