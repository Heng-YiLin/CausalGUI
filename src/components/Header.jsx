import React from "react";
import Logo from "../assets/logo.png";
import { Link } from "react-router-dom"; // Link component for navigation

const nodes = JSON.parse(localStorage.getItem("cld-nodes") || "[]");

const downloadNodesAsJSON = () => {
  const dataStr = JSON.stringify(nodes, null, 2); // Pretty-print with indentation
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "nodes.json";
  a.click();

  URL.revokeObjectURL(url);
};
const Header = () => {
  return (
    <nav className="sticky top-0 z-30 w-full shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="text-2xl font-bold text-gray-900">
            <Link to="/">
              <img src={Logo} alt="Logo"></img>
            </Link>
          </div>
          <div className="flex space-x-6">
            <Link to="/DDM">Direct Dependency Matrix</Link>
            <Link to="/FactorClassGraph">Factor Class Graph</Link>
            <button
              onClick={downloadNodesAsJSON}
              className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-3 py-1 rounded"
            >
              Download
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Header;
