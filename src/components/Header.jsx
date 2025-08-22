import Logo from "../assets/logo.png";
import { Link } from "react-router-dom";

const downloadCsv = () => {
  window.dispatchEvent(new Event("ddm-export-csv"));
};
const downloadNodesAndEdgesJson = () => {
  const nodes = JSON.parse(localStorage.getItem("savedNodes") || "[]");
  const edges = JSON.parse(localStorage.getItem("savedEdges") || "[]");

  const data = {
    nodes,
    edges,
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "nodes_and_edges.json";
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
