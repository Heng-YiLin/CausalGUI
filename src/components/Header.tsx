import React from "react";

interface HeaderProps {
  brandText?: string; // Optional prop, define as needed
}

/**
 * Header component for the application.
 *
 * Displays the application logo and navigation links.
 * Includes a dropdown menu.
 *
 * @param {Object} props - Component props
 * @param {string} [props.brandText] - Text to display for the brand/logo
 */
const Header: React.FC<HeaderProps> = ({ brandText }) => {
  return (
    <div className="navbar bg-base-100 relative">
      <div className="navbar-start">
        {/* Dropdown for mobile view */}
        <div className="dropdown lg:hidden">
          <label tabIndex={0} className="btn btn-ghost btn-circle">
            {/* Hamburger icon for toggling the dropdown */}
            
          </label>
          <ul
            tabIndex={0}
            className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52"
          >
            <li><a>Item 1</a></li>
            <li><a>Item 2</a></li>
          </ul>
        </div>
      </div>

      {/* Optional brand text */}
      {brandText && (
        <div className="navbar-center">
          <a className="btn btn-ghost normal-case text-xl">{brandText}</a>
        </div>
      )}
    </div>
  );
};

export default Header;
