import React from "react";
import Logo from "../assets/logo.png";
import { Link } from "react-router-dom";

const downloadCsv = () => {
  window.dispatchEvent(new Event("ddm-export-csv"));
};
const Header = () => {
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
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Header;
