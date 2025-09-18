import Logo from "../assets/logo.png";
import { Link } from "react-router-dom";

const downloadCsv = () => {
  window.dispatchEvent(new Event("ddm-export-csv"));
};
const downloadNodesAndEdgesJson = () => {
  const rawNodes = JSON.parse(localStorage.getItem("savedNodes") || "[]");
  const rawEdges = JSON.parse(localStorage.getItem("savedEdges") || "[]");

  // Ensure all nodes have the right structure
  const nodes = rawNodes.map((n) => ({
    id: n.id,
    type: n.type ?? "custom",
    position: n.position ?? { x: 0, y: 0 },
    data: {
      label: n.data?.label ?? `Node ${n.id}`,
    },
    measured: n.measured ?? { width: 80, height: 40 },
    selected: n.selected ?? false,
    dragging: n.dragging ?? false,
  }));

  const edges = rawEdges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: e.type ?? "floating",
    data: {
      impact: e.data?.impact ?? 0,
      control: e.data?.control ?? 0,
      offset: e.data?.offset ?? 0,
      sign: e.data?.sign ?? null,
    },
    selected: e.selected ?? false,
  }));

  const data = { nodes, edges };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "causal_GUI_nodes_and_edges.json";
  a.click();
  URL.revokeObjectURL(url);
};

const Header = ({ onImportJson }) => {
  return (
    <nav className="sticky top-0 z-30 w-full shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="text-2xl font-bold text-gray-900">
            <Link to="/">
              <img src={Logo} alt="Logo" />
            </Link>
          </div>
          <div className="flex space-x-6">
            <Link to="/DDM">Direct Dependency Matrix</Link>
            <Link to="/PM">Polarity Matrix</Link>
            <Link to="/LoopID">Loops</Link>
            <Link to="/FactorClassGraph">Factor Class Graph</Link>
            <button
              onClick={downloadCsv}
              className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-3 py-1 rounded"
            >
              Download
            </button>
            <button
              onClick={downloadNodesAndEdgesJson}
              className="bg-green-500 hover:bg-green-600 text-white text-sm px-3 py-1 rounded"
            >
              Export Nodes & Edges JSON
            </button>

            <label className="bg-purple-500 hover:bg-purple-600 text-white text-sm px-3 py-1 rounded cursor-pointer">
              Import Nodes & Edges JSON
              <input
                type="file"
                accept=".json"
                onChange={onImportJson}
                style={{ display: "none" }}
              />
            </label>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Header;
